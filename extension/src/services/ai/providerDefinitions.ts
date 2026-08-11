import type { AIProviderName, ProviderDefinition } from './types'

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    defaultModel: 'qwen-plus',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  {
    id: 'custom',
    label: 'Custom Provider',
    defaultModel: '',
    defaultBaseUrl: '',
  },
]

export function getProviderDefinition(provider: AIProviderName) {
  return (
    PROVIDER_DEFINITIONS.find((definition) => definition.id === provider) ??
    PROVIDER_DEFINITIONS[0]
  )
}
