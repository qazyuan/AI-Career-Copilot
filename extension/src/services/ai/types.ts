export type AIProviderName = 'deepseek' | 'openai' | 'qwen' | 'custom'

export interface AIProviderConfig {
  provider: AIProviderName
  apiKey: string
  model: string
  baseUrl: string
}

export interface ProviderDefinition {
  id: AIProviderName
  label: string
  defaultModel: string
  defaultBaseUrl: string
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIChatRequest {
  messages: AIChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json_object'
}

export interface AIChatResponse {
  content: string
  raw?: unknown
}

export interface AIProvider {
  chat(request: AIChatRequest): Promise<AIChatResponse>
}
