import { AIProviderError } from '../errors'

interface ProviderErrorBody {
  error?: {
    message?: unknown
  }
  message?: unknown
}

export function createProviderErrorFromResponse(status: number, raw: unknown) {
  const message = getErrorMessage(raw)

  if (status === 401 || status === 403) {
    return new AIProviderError(
      message ?? 'Authentication failed. Check your API key.',
      'unauthorized',
      { status, raw },
    )
  }

  if (status === 429) {
    return new AIProviderError(
      message ?? 'Rate limited. Try again later.',
      'rate-limited',
      { status, raw },
    )
  }

  return new AIProviderError(
    message ?? 'Provider request failed.',
    'provider-error',
    { status, raw },
  )
}

export function normalizeUnknownProviderError(error: unknown) {
  if (error instanceof AIProviderError) {
    return error
  }

  if (error instanceof TypeError) {
    return new AIProviderError(
      'Network request failed. Check the base URL.',
      'network-error',
      { raw: error },
    )
  }

  return new AIProviderError('Provider request failed.', 'provider-error', {
    raw: error,
  })
}

function getErrorMessage(raw: unknown) {
  const body = raw as ProviderErrorBody
  const nestedMessage = body.error?.message
  const message = body.message

  if (typeof nestedMessage === 'string') {
    return nestedMessage
  }

  if (typeof message === 'string') {
    return message
  }

  return undefined
}
