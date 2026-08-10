export function isChromeExtensionRuntimeAvailable() {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
}
