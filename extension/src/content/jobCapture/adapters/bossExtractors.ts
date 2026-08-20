import { getShortTextCandidates, getVisibleText, normalizeText, splitTextLines } from './textUtils'

const minJobDescriptionLength = 120
const maxJobDescriptionLength = 7000

const jobDescriptionAnchors = ['职位描述', '岗位职责', '任职要求', '职位要求', '工作职责']

const noisyTextPatterns = [
  /首页\s*职位\s*公司/,
  /推荐\s*\|?\s*兼职/,
  /地图搜索/,
  /搜索职位/,
  /立即沟通/,
  /微信扫码/,
  /收藏/,
  /举报/,
  /相关推荐/,
  /看过该职位的人还看了/,
  /BOSS直聘/,
  /隐私政策/,
  /用户协议/,
]

const jobTitlePatterns = [
  /工程师/,
  /开发/,
  /前端/,
  /后端/,
  /全栈/,
  /架构/,
  /测试/,
  /运维/,
  /算法/,
  /数据/,
  /产品/,
  /设计/,
  /运营/,
  /经理/,
  /顾问/,
  /实习/,
  /专家/,
  /leader/i,
  /engineer|developer|frontend|backend|full[- ]?stack|architect|designer|manager/i,
  /tech\s*lead|lead|agent|ai|ml|llm|sre|devops|data|platform|product/i,
]

const salaryPattern = /\b\d{1,3}\s*[-~]\s*\d{1,3}\s*[kK](?:[·xX*]\s*\d{1,2}\s*薪?)?\b|薪资面议|面议/
const experiencePattern = /\b\d{1,2}\s*[-~]\s*\d{1,2}\s*年\b|\b\d{1,2}\s*年以上\b|经验不限|应届生|在校生/
const educationPattern = /学历不限|大专|本科|硕士|博士|高中|中专/

const locationPattern =
  /北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|天津|重庆|长沙|郑州|青岛|厦门|合肥|宁波|佛山|东莞|无锡|珠海|远程/
const locationCleanupPattern =
  /北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|天津|重庆|长沙|郑州|青岛|厦门|合肥|宁波|佛山|东莞|无锡|珠海|远程/g

export interface BossCapturedFields {
  jobTitle: string | null
  company: string | null
  salary: string | null
  location: string | null
  experienceRequirement: string | null
  educationRequirement: string | null
  jobDescription: string | null
}

export function extractBossFields(document: Document): BossCapturedFields {
  const root = getBossDetailRoot(document) ?? getBossMainRoot(document)
  const shortTextCandidates = getShortTextCandidates(root)
  const pageText = getVisibleText(root)

  return {
    jobTitle: extractBossJobTitle(document, root, shortTextCandidates),
    company: extractBossCompany(document, shortTextCandidates),
    salary: parseBossSalary(shortTextCandidates.join('\n') || pageText),
    location: extractBossLocation(shortTextCandidates),
    experienceRequirement: parseBossExperience(shortTextCandidates.join('\n') || pageText),
    educationRequirement: parseBossEducation(shortTextCandidates.join('\n') || pageText),
    jobDescription: extractBossJobDescription(document),
  }
}

export function getBossMainRoot(document: Document) {
  return (
    document.querySelector('main') ??
    document.querySelector('[role="main"]') ??
    findNearestUsefulContainer(document, '职位描述') ??
    document.body
  )
}

export function getBossDetailRoot(document: Document) {
  const anchorElements = [
    ...findExactTextAnchorElements(document, jobDescriptionAnchors),
    ...findTextAnchorElements(document, jobDescriptionAnchors),
  ]
  const candidates: Array<{ element: Element; score: number }> = []
  const seenElements = new Set<Element>()

  for (const anchorElement of anchorElements) {
    let currentElement: Element | null = anchorElement

    for (let depth = 0; currentElement && depth < 8; depth += 1) {
      if (seenElements.has(currentElement)) {
        currentElement = currentElement.parentElement
        continue
      }

      seenElements.add(currentElement)

      const text = getVisibleText(currentElement)
      const score = getBossDetailRootScore(text)

      if (score > 0) {
        candidates.push({ element: currentElement, score })
      }

      currentElement = currentElement.parentElement
    }
  }

  return candidates.sort((first, second) => second.score - first.score)[0]?.element ?? null
}

export function isBossDesktopJobDetailPage(context: { document: Document; location: Location }) {
  if (context.location.hostname !== 'www.zhipin.com') {
    return false
  }

  const isSupportedDesktopDetailPath =
    context.location.pathname.includes('/job_detail/') ||
    context.location.pathname.startsWith('/web/geek/job')

  if (!isSupportedDesktopDetailPath) {
    return false
  }

  const pageText = getVisibleText(context.document)
  const detailText = pageText.slice(0, 20000)
  const hasDetailAnchor =
    /职位描述|岗位职责|任职要求|职位要求/.test(detailText) ||
    findExactTextAnchorElements(context.document, jobDescriptionAnchors).length > 0
  const signalHits = [
    hasDetailAnchor,
    /立即沟通|与BOSS随时沟通|收藏|举报/.test(detailText),
    salaryPattern.test(detailText),
    experiencePattern.test(detailText),
    educationPattern.test(detailText),
    jobTitlePatterns.some((pattern) => pattern.test(detailText)),
  ].filter(Boolean).length

  return hasDetailAnchor && signalHits >= 3
}

export function parseBossSalary(text: string) {
  return normalizeText(text).match(salaryPattern)?.[0] ?? null
}

export function parseBossExperience(text: string) {
  return normalizeText(text).match(experiencePattern)?.[0] ?? null
}

export function parseBossEducation(text: string) {
  return normalizeText(text).match(educationPattern)?.[0] ?? null
}

export function extractBossJobDescription(document: Document) {
  const anchorElements = [
    ...findExactTextAnchorElements(document, jobDescriptionAnchors),
    ...findTextAnchorElements(document, jobDescriptionAnchors),
  ]
  const candidates: Array<{ text: string; score: number }> = []
  const seenElements = new Set<Element>()

  for (const anchorElement of anchorElements) {
    if (seenElements.has(anchorElement)) {
      continue
    }

    seenElements.add(anchorElement)

    let currentElement: Element | null = anchorElement

    for (let depth = 0; currentElement && depth < 7; depth += 1) {
      const text = cleanupBossDescriptionText(getVisibleText(currentElement))
      const score = getJobDescriptionCandidateScore(text)

      if (score > 0) {
        candidates.push({ text, score })
      }

      currentElement = currentElement.parentElement
    }
  }

  const bestCandidate = candidates.sort((first, second) => second.score - first.score)[0]

  return bestCandidate?.text ?? extractBossJobDescriptionFromPageText(document)
}

export function cleanupBossDescriptionText(text: string) {
  const lines = splitTextLines(text)
    .filter((line) => !noisyTextPatterns.some((pattern) => pattern.test(line)))
    .filter((line) => line.length > 1)

  return lines.join('\n')
}

function extractBossJobTitle(document: Document, root: ParentNode, shortTextCandidates: string[]) {
  const titleFromDetailHeader = extractBossJobTitleFromDetailHeader(root)

  if (titleFromDetailHeader) {
    return titleFromDetailHeader
  }

  const candidates = [
    ...Array.from(root.querySelectorAll('h1, h2')).map((element) =>
      normalizeText(element.textContent ?? ''),
    ),
    ...shortTextCandidates,
    ...document.title.split(/[-_|—]/).map(normalizeText),
  ].filter(isReasonableJobTitle)

  const bestCandidate = candidates
    .map((text) => ({ text, score: getJobTitleScore(text) }))
    .sort((first, second) => second.score - first.score)[0]

  return bestCandidate ? cleanupBossJobTitle(bestCandidate.text) : null
}

function extractBossJobTitleFromDetailHeader(root: ParentNode) {
  const salaryElements = Array.from(root.querySelectorAll('h1, h2, h3, p, div, span')).filter(
    (element) => salaryPattern.test(normalizeText(element.textContent ?? '')),
  )
  const candidates: Array<{ text: string; score: number }> = []

  for (const salaryElement of salaryElements) {
    let currentElement: Element | null = salaryElement

    for (let depth = 0; currentElement && depth < 5; depth += 1) {
      const text = normalizeText(currentElement.textContent ?? '')

      if (isReasonableDetailHeaderText(text)) {
        const title = cleanupBossJobTitle(text)

        if (title && isReasonableJobTitle(title)) {
          candidates.push({
            text: title,
            score: getJobTitleScore(text) + getDetailHeaderTitleScore(text, title),
          })
        }
      }

      currentElement = currentElement.parentElement
    }
  }

  return candidates.sort((first, second) => second.score - first.score)[0]?.text ?? null
}

function extractBossCompany(document: Document, shortTextCandidates: string[]) {
  const titleParts = document.title
    .split(/[-_|—]/)
    .map(normalizeText)
    .filter((text) => text.length >= 2 && text.length <= 50)

  const companyFromTitle = titleParts.find(
    (part) => !isReasonableJobTitle(part) && !salaryPattern.test(part) && !/BOSS直聘/.test(part),
  )

  if (companyFromTitle) {
    return companyFromTitle
  }

  return (
    shortTextCandidates.find(
      (text) =>
        text.length >= 2 &&
        text.length <= 40 &&
        /公司|科技|信息|网络|软件|集团|有限|inc\.?|ltd\.?/i.test(text) &&
        !noisyTextPatterns.some((pattern) => pattern.test(text)),
    ) ?? null
  )
}

function extractBossLocation(shortTextCandidates: string[]) {
  return shortTextCandidates.find((text) => text.length <= 30 && locationPattern.test(text)) ?? null
}

function findTextAnchorElements(document: Document, anchors: string[]) {
  return Array.from(document.body.querySelectorAll('h1, h2, h3, h4, p, div, section, article, li, span')).filter(
    (element) => {
      const text = normalizeText(element.textContent ?? '')

      return anchors.some((anchor) => text.includes(anchor))
    },
  )
}

function findExactTextAnchorElements(document: Document, anchors: string[]) {
  return Array.from(document.body.querySelectorAll('h1, h2, h3, h4, p, div, section, article, li, span')).filter(
    (element) => {
      const text = normalizeText(element.textContent ?? '')

      return anchors.includes(text)
    },
  )
}

function findNearestUsefulContainer(document: Document, anchor: string) {
  const anchorElement = findTextAnchorElements(document, [anchor])[0]
  let currentElement = anchorElement?.parentElement ?? null

  while (currentElement) {
    const text = getVisibleText(currentElement)

    if (text.length >= minJobDescriptionLength && text.length <= maxJobDescriptionLength) {
      return currentElement
    }

    currentElement = currentElement.parentElement
  }

  return null
}

function getBossDetailRootScore(text: string) {
  if (text.length < minJobDescriptionLength || text.length > 12000) {
    return 0
  }

  if (!/职位描述|岗位职责|任职要求|职位要求/.test(text)) {
    return 0
  }

  if (!salaryPattern.test(text)) {
    return 0
  }

  let score = 10

  if (experiencePattern.test(text)) {
    score += 4
  }

  if (educationPattern.test(text)) {
    score += 4
  }

  if (/立即沟通|与BOSS随时沟通|收藏/.test(text)) {
    score += 2
  }

  if (/工作地址/.test(text)) {
    score += 2
  }

  if (/推荐\s*\|?\s*兼职|搜索职位|首页\s*职位\s*公司/.test(text)) {
    score -= 10
  }

  return score
}

function getJobDescriptionCandidateScore(text: string) {
  if (text.length < minJobDescriptionLength || text.length > maxJobDescriptionLength) {
    return 0
  }

  const anchorHits = jobDescriptionAnchors.filter((anchor) => text.includes(anchor)).length

  if (anchorHits === 0) {
    return 0
  }

  let score = anchorHits * 10 + Math.min(text.length, 2000) / 100

  if (/React|Vue|JavaScript|TypeScript|Node\.js|HTML|CSS|Java|Python/i.test(text)) {
    score += 4
  }

  if (/看过该职位的人还看了|相关推荐|首页\s*职位\s*公司/.test(text)) {
    score -= 12
  }

  return score
}

function extractBossJobDescriptionFromPageText(document: Document) {
  const pageText = getVisibleText(document)
  const candidates = jobDescriptionAnchors
    .map((anchor) => {
      const anchorIndex = pageText.indexOf(anchor)

      if (anchorIndex === -1) {
        return null
      }

      const textAfterAnchor = pageText.slice(anchorIndex)
      const stopMatch = textAfterAnchor.match(
        /工作地址|公司介绍|工商信息|职位推荐|看过该职位的人还看了|相似职位/,
      )
      const endIndex = stopMatch?.index
      const candidateText =
        typeof endIndex === 'number'
          ? textAfterAnchor.slice(0, endIndex)
          : textAfterAnchor.slice(0, maxJobDescriptionLength)
      const normalizedCandidate = cleanupBossDescriptionTextSegment(candidateText)
      const score = getJobDescriptionCandidateScore(normalizedCandidate)

      return score > 0 ? { text: normalizedCandidate, score } : null
    })
    .filter((candidate): candidate is { text: string; score: number } => Boolean(candidate))

  return candidates.sort((first, second) => second.score - first.score)[0]?.text ?? null
}

function cleanupBossDescriptionTextSegment(text: string) {
  return normalizeText(
    text
      .replace(/微信扫码分享/g, ' ')
      .replace(/立即沟通/g, ' ')
      .replace(/收藏/g, ' ')
      .replace(/举报/g, ' ')
      .replace(/去App\s*与BOSS随时沟通/g, ' ')
      .replace(/与BOSS随时沟通/g, ' '),
  )
}

function isReasonableJobTitle(text: string) {
  if (text.length < 2 || text.length > 70) {
    return false
  }

  if (
    /职位描述|岗位职责|任职要求|首页|推荐|地图搜索|搜索职位|立即沟通|收藏|举报|BOSS直聘/.test(
      text,
    )
  ) {
    return false
  }

  return jobTitlePatterns.some((pattern) => pattern.test(text))
}

function isReasonableDetailHeaderText(text: string) {
  if (text.length < 6 || text.length > 180) {
    return false
  }

  if (!salaryPattern.test(text)) {
    return false
  }

  if (/职位描述|岗位职责|任职要求|工作地址|公司介绍|推荐\s*\|?\s*兼职/.test(text)) {
    return false
  }

  return jobTitlePatterns.some((pattern) => pattern.test(text))
}

function getDetailHeaderTitleScore(text: string, title: string) {
  let score = 8

  if (new RegExp(`${escapeRegExp(title)}\\s*${salaryPattern.source}`, 'i').test(text)) {
    score += 8
  }

  if (experiencePattern.test(text) && educationPattern.test(text)) {
    score += 4
  }

  return score
}

function getJobTitleScore(text: string) {
  let score = 0

  if (jobTitlePatterns.some((pattern) => pattern.test(text))) {
    score += 10
  }

  if (salaryPattern.test(text)) {
    score += 6
  }

  if (text.length <= 30) {
    score += 4
  }

  if (/[\s·]\d{1,2}\s*[-~]\s*\d{1,2}\s*年|本科|大专|硕士|博士/.test(text)) {
    score -= 2
  }

  return score
}

function cleanupBossJobTitle(text: string) {
  const cleanedText = normalizeText(
    text
      .replace(salaryPattern, ' ')
      .replace(experiencePattern, ' ')
      .replace(educationPattern, ' ')
      .replace(locationCleanupPattern, ' '),
  )
  const titleSegments = cleanedText
    .split(/\s{2,}|(?<=\))\s+|(?<=）)\s+|[|｜]/)
    .map((segment) => segment.replace(/[()（）]/g, '').trim())
    .filter(Boolean)
  const titleSegment = titleSegments
    .sort((first, second) => getJobTitleScore(second) - getJobTitleScore(first))
    .find((segment) => isReasonableJobTitle(segment))

  return titleSegment || cleanedText || null
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
