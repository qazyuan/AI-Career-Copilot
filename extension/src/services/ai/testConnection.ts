import { createAIProvider } from './createAIProvider'
import { normalizeUnknownProviderError } from './utils/normalizeProviderError'
import type { AIProviderConfig } from './types'

export interface TestConnectionResult {
  success: boolean
  message: string
}

export async function testAIProviderConnection(
  config: AIProviderConfig,
): Promise<TestConnectionResult> {
  try {
    const provider = createAIProvider(config)

    await provider.chat({
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      model: config.model,
      temperature: 0,
      maxTokens: 8,
    })

    return {
      success: true,
      message: 'Connection test succeeded.',
    }
  } catch (error) {
    const providerError = normalizeUnknownProviderError(error)

    return {
      success: false,
      message: providerError.message,
    }
  }
}
