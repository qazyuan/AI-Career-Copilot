export type ResumePdfParseErrorCode =
  | 'invalid-file-type'
  | 'file-too-large'
  | 'pdf-load-failed'
  | 'empty-pdf-text'
  | 'encrypted-pdf'
  | 'unsupported-pdf'

export class ResumePdfParseError extends Error {
  code: ResumePdfParseErrorCode

  constructor(message: string, code: ResumePdfParseErrorCode) {
    super(message)
    this.name = 'ResumePdfParseError'
    this.code = code
  }
}
