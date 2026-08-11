import type { AIProviderConfig } from '../ai'

export const AI_CONFIG_STORAGE_KEY = 'aiProviderConfig'

export async function getAIProviderConfig() {
  const result = await chrome.storage.local.get(AI_CONFIG_STORAGE_KEY)

  return result[AI_CONFIG_STORAGE_KEY] as AIProviderConfig | undefined
}

export async function saveAIProviderConfig(config: AIProviderConfig) {
  await chrome.storage.local.set({
    [AI_CONFIG_STORAGE_KEY]: config,
  })
}
