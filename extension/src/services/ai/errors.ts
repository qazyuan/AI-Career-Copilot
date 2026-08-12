export type AIProviderErrorCode =
  | 'missing-api-key'
  | 'invalid-config'
  | 'unauthorized'
  | 'rate-limited'
  | 'network-error'
  | 'provider-error'
  | 'invalid-response'

export class AIProviderError extends Error {
  code: AIProviderErrorCode
  status?: number
  raw?: unknown

  constructor(
    message: string,
    code: AIProviderErrorCode,
    options?: { status?: number; raw?: unknown },
  ) {
    super(message)
    this.name = 'AIProviderError'
    this.code = code
    this.status = options?.status
    this.raw = options?.raw
  }
}
