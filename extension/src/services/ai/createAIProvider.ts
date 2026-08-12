import { AIProviderError } from './errors'
import { CustomProvider } from './providers/CustomProvider'
import { DeepSeekProvider } from './providers/DeepSeekProvider'
import { OpenAIProvider } from './providers/OpenAIProvider'
import { QwenProvider } from './providers/QwenProvider'
import type { AIProvider, AIProviderConfig } from './types'

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case 'deepseek':
      return new DeepSeekProvider(config)
    case 'openai':
      return new OpenAIProvider(config)
    case 'qwen':
      return new QwenProvider(config)
    case 'custom':
      return new CustomProvider(config)
    default:
      throw new AIProviderError('Unsupported provider.', 'invalid-config')
  }
}
