import { AIProviderError } from '../errors'
import type { AIChatResponse } from '../types'

interface ChatCompletionLikeResponse {
  choices?: Array<{
    finish_reason?: unknown
    message?: {
      content?: unknown
      reasoning_content?: unknown
    }
  }>
}

export function parseChatCompletionResponse(raw: unknown): AIChatResponse {
  const response = raw as ChatCompletionLikeResponse
  const choice = response.choices?.[0]
  const content = choice?.message?.content

  if (typeof content !== 'string') {
    throw new AIProviderError(
      'Provider returned an unexpected response.',
      'invalid-response',
      { raw },
    )
  }

  if (
    !content.trim() &&
    choice?.finish_reason === 'length' &&
    typeof choice.message?.reasoning_content === 'string'
  ) {
    throw new AIProviderError(
      'Provider used the full output budget for reasoning and returned no final answer. Try a non-reasoning chat model or increase max tokens.',
      'invalid-response',
      { raw },
    )
  }

  return {
    content,
    raw,
  }
}
