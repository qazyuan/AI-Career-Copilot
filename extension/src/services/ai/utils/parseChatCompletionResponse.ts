import { AIProviderError } from '../errors'
import type { AIChatResponse } from '../types'

interface ChatCompletionLikeResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

export function parseChatCompletionResponse(raw: unknown): AIChatResponse {
  const response = raw as ChatCompletionLikeResponse
  const content = response.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new AIProviderError(
      'Provider returned an unexpected response.',
      'invalid-response',
      { raw },
    )
  }

  return {
    content,
    raw,
  }
}
