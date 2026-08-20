import type { CapturedJob } from '../../shared/jobCapture'
import { extractTextBlocks } from './extractTextBlocks'
import { getJobPageConfidence } from './isLikelyJobPage'

const maxCapturedJobTextLength = 12000
const minCapturedJobTextLength = 120

const selectorsToRemove = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'iframe',
  '[role="navigation"]',
  '[aria-label*="nav" i]',
  '.advertisement',
  '.ad',
  '.modal',
  '.footer',
  '.header',
]

export function captureJobWithGenericExtractor(document: Document): CapturedJob {
  const root = getExtractionRoot(document)
  const clonedRoot = root.cloneNode(true) as Element

  for (const selector of selectorsToRemove) {
    clonedRoot.querySelectorAll(selector).forEach((element) => element.remove())
  }

  const textBlocks = extractTextBlocks(clonedRoot)
  const extractionWarnings: string[] = []
  let contentText = rankTextBlocks(textBlocks).join('\n')

  if (contentText.length > maxCapturedJobTextLength) {
    contentText = contentText.slice(0, maxCapturedJobTextLength)
    extractionWarnings.push('Captured text was truncated because it was too long.')
  }

  if (contentText.length < minCapturedJobTextLength) {
    throw new Error('Captured text is too short to analyze.')
  }

  const confidence = getJobPageConfidence(contentText)

  if (confidence === 'low') {
    extractionWarnings.push(
      'This page has low job-posting confidence. Analysis may be less accurate.',
    )
  }

  const likelyTitle = getLikelyTitle(document, clonedRoot, textBlocks)

  return {
    url: window.location.href,
    title: likelyTitle,
    siteName: window.location.hostname,
    capturedAt: new Date().toISOString(),
    source: 'generic',
    adapterId: null,
    contentText,
    rawPageTitle: document.title,
    metadata: {
      confidence,
      extractionWarnings,
      jobTitle: likelyTitle,
    },
    stats: {
      textLength: contentText.length,
      textBlockCount: textBlocks.length,
    },
  }
}

function getExtractionRoot(document: Document) {
  return (
    document.querySelector('main') ??
    document.querySelector('article') ??
    document.querySelector('[role="main"]') ??
    document.body
  )
}

function rankTextBlocks(textBlocks: string[]) {
  return [...textBlocks].sort((first, second) => getBlockScore(second) - getBlockScore(first))
}

function getBlockScore(text: string) {
  let score = Math.min(text.length, 500) / 100

  if (/职位描述|岗位职责|任职要求|职位要求|工作职责/i.test(text)) {
    score += 10
  }

  if (/responsibilities|requirements|qualifications|about the role/i.test(text)) {
    score += 10
  }

  if (/react|vue|javascript|typescript|node\.js|java|python/i.test(text)) {
    score += 3
  }

  return score
}

const titleCandidateSelectors = [
  'h1',
  'h2',
  '[class*="job-title" i]',
  '[class*="position" i]',
  '[class*="职位" i]',
  '[class*="title" i]',
  '[class*="name" i]',
]

const navigationTitlePatterns = [
  /首页/,
  /校园/,
  /海归/,
  /无障碍/,
  /登录/,
  /注册/,
  /收藏/,
  /立即沟通/,
  /扫码/,
  /\b(app|jobs?|companies|login|sign in|sign up)\b/i,
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
]

function getLikelyTitle(document: Document, root: ParentNode, textBlocks: string[]) {
  const candidates = collectTitleCandidates(document, root, textBlocks)
    .map((text) => normalizeTitleCandidate(text))
    .filter((text): text is string => Boolean(text))
    .filter(isReasonableTitleCandidate)

  const bestCandidate = candidates
    .map((text) => ({ text, score: getTitleCandidateScore(text) }))
    .sort((first, second) => second.score - first.score)[0]

  if (bestCandidate && bestCandidate.score > 0) {
    return bestCandidate.text
  }

  return null
}

function collectTitleCandidates(document: Document, root: ParentNode, textBlocks: string[]) {
  const candidates = new Set<string>()

  for (const selector of titleCandidateSelectors) {
    root.querySelectorAll(selector).forEach((element) => {
      const text = element.textContent?.trim()

      if (text) {
        candidates.add(text)
      }
    })
  }

  for (const block of textBlocks.slice(0, 20)) {
    candidates.add(block)
  }

  if (document.title) {
    candidates.add(document.title)
    document.title.split(/[-_|—]/).forEach((part) => candidates.add(part))
  }

  return [...candidates]
}

function normalizeTitleCandidate(text: string) {
  return text.replace(/\s+/g, ' ').trim() || null
}

function isReasonableTitleCandidate(text: string) {
  if (text.length < 2 || text.length > 80) {
    return false
  }

  const navigationPatternHits = navigationTitlePatterns.filter((pattern) => pattern.test(text)).length
  const looksLikeNavigation = navigationPatternHits >= 2 || /首页.*职位.*公司/.test(text)

  if (looksLikeNavigation) {
    return false
  }

  if (/职位描述|岗位职责|任职要求|工作职责|职位要求/.test(text)) {
    return false
  }

  return true
}

function getTitleCandidateScore(text: string) {
  let score = 0

  if (jobTitlePatterns.some((pattern) => pattern.test(text))) {
    score += 10
  }

  if (/\d+\s*[-~]\s*\d+\s*[kK]|薪|月薪|年薪/.test(text)) {
    score += 3
  }

  if (/本科|大专|硕士|博士|经验|年/.test(text)) {
    score += 1
  }

  if (text.length <= 40) {
    score += 2
  }

  if (navigationTitlePatterns.some((pattern) => pattern.test(text))) {
    score -= 4
  }

  return score
}
