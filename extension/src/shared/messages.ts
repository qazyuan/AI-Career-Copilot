import type { CapturedJob } from './jobCapture'

export type ExtensionMessage =
  | CaptureCurrentTabJobRequest
  | CaptureCurrentTabJobResponse
  | CaptureJobFromPageRequest
  | CaptureJobFromPageResponse

export interface CaptureCurrentTabJobRequest {
  type: 'CAPTURE_CURRENT_TAB_JOB'
}

export interface CaptureCurrentTabJobResponse {
  type: 'CAPTURE_CURRENT_TAB_JOB_RESPONSE'
  success: boolean
  capturedJob?: CapturedJob
  error?: string
}

export interface CaptureJobFromPageRequest {
  type: 'CAPTURE_JOB_FROM_PAGE'
}

export interface CaptureJobFromPageResponse {
  type: 'CAPTURE_JOB_FROM_PAGE_RESPONSE'
  success: boolean
  capturedJob?: CapturedJob
  error?: string
}
