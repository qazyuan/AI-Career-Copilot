import { AIProviderError } from '../errors'
import type { AIChatRequest, AIChatResponse, AIProvider, AIProviderConfig } from '../types'
import { buildChatCompletionsUrl } from '../utils/buildChatCompletionsUrl'
import { createProviderErrorFromResponse } from '../utils/normalizeProviderError'
import { parseChatCompletionResponse } from '../utils/parseChatCompletionResponse'

export class OpenAICompatibleProvider implements AIProvider {
  protected config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    this.validateConfig()

    const requestBody = {
      model: request.model ?? this.config.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      response_format:
        request.responseFormat === 'json_object'
          ? { type: 'json_object' }
          : undefined,
      ...(this.config.provider === 'deepseek'
        ? { thinking: { type: 'disabled' } }
        : {}),
    }

    const response = await fetch(buildChatCompletionsUrl(this.config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const raw = await readJsonResponse(response)

    if (!response.ok) {
      throw createProviderErrorFromResponse(response.status, raw)
    }

    return parseChatCompletionResponse(raw)
  }

  private validateConfig() {
    if (!this.config.apiKey.trim()) {
      throw new AIProviderError('Please enter an API key.', 'missing-api-key')
    }

    if (!this.config.model.trim()) {
      throw new AIProviderError('Please enter a model.', 'invalid-config')
    }

    if (!this.config.baseUrl.trim()) {
      throw new AIProviderError('Please enter a base URL.', 'invalid-config')
    }
  }
}

async function readJsonResponse(response: Response) {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}
