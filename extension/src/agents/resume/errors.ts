export type ResumeAgentErrorCode =
  | 'empty-input'
  | 'ai-request-failed'
  | 'invalid-json'
  | 'invalid-schema'

export class ResumeAgentError extends Error {
  code: ResumeAgentErrorCode

  constructor(message: string, code: ResumeAgentErrorCode) {
    super(message)
    this.name = 'ResumeAgentError'
    this.code = code
  }
}
