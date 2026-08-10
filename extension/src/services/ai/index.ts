export type AIProviderName = 'openai' | 'deepseek' | 'qwen'

export interface AIProvider {
  chat(): Promise<unknown>
  embedding(): Promise<unknown>
}
