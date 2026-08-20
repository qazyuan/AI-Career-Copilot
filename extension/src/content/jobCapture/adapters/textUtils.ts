const hiddenElementSelectors = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  '[hidden]',
  '[aria-hidden="true"]',
]

export function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function getVisibleText(element: Element | Document) {
  const sourceElement =
    element instanceof Document ? element.body || element.documentElement : element
  const clonedElement = sourceElement.cloneNode(true) as Element

  for (const selector of hiddenElementSelectors) {
    clonedElement.querySelectorAll(selector).forEach((item) => item.remove())
  }

  return normalizeText(clonedElement.textContent ?? '')
}

export function splitTextLines(text: string) {
  return text
    .split(/\n|。|；|;|\|/)
    .map(normalizeText)
    .filter(Boolean)
}

export function uniqueStrings(items: string[]) {
  const seen = new Set<string>()
  const uniqueItems: string[] = []

  for (const item of items) {
    if (seen.has(item)) {
      continue
    }

    seen.add(item)
    uniqueItems.push(item)
  }

  return uniqueItems
}

export function getShortTextCandidates(root: ParentNode, maxLength = 80) {
  const elements = Array.from(root.querySelectorAll('h1, h2, h3, p, li, span, div'))
  const candidates = elements
    .map((element) => normalizeText(element.textContent ?? ''))
    .filter((text) => text.length > 0 && text.length <= maxLength)

  return uniqueStrings(candidates)
}
