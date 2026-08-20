const ignoredTextPatterns = [
  '收藏',
  '立即沟通',
  '举报',
  '分享',
  '登录',
  '注册',
  '隐私政策',
  '相关推荐',
  'cookie',
  'privacy policy',
  'sign in',
  'sign up',
]

export function extractTextBlocks(root: ParentNode) {
  const elements = Array.from(
    root.querySelectorAll('h1, h2, h3, p, li, section, article, div'),
  )
  const seen = new Set<string>()
  const blocks: string[] = []

  for (const element of elements) {
    const text = normalizeText(element.textContent ?? '')

    if (!isUsefulTextBlock(text) || seen.has(text)) {
      continue
    }

    seen.add(text)
    blocks.push(text)
  }

  return blocks
}

function isUsefulTextBlock(text: string) {
  if (text.length < 8) {
    return false
  }

  if (ignoredTextPatterns.some((pattern) => text.toLowerCase().includes(pattern))) {
    return false
  }

  return true
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}
