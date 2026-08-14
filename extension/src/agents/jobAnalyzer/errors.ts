export type JobAnalyzerErrorCode =
  | 'empty-input'
  | 'ai-request-failed'
  | 'invalid-json'
  | 'invalid-schema'

export class JobAnalyzerError extends Error {
  code: JobAnalyzerErrorCode

  constructor(message: string, code: JobAnalyzerErrorCode) {
    super(message)
    this.name = 'JobAnalyzerError'
    this.code = code
  }
}
