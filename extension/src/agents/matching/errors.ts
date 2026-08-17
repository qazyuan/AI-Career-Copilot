export type MatchingAgentErrorCode =
  | 'missing-input'
  | 'ai-request-failed'
  | 'invalid-json'
  | 'invalid-schema'

export class MatchingAgentError extends Error {
  code: MatchingAgentErrorCode

  constructor(message: string, code: MatchingAgentErrorCode) {
    super(message)
    this.name = 'MatchingAgentError'
    this.code = code
  }
}
