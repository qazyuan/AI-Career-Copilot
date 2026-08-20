import type { CapturedJob } from '../../../shared/jobCapture'

export interface JobSiteAdapterContext {
  document: Document
  location: Location
  capturedAt: string
}

export interface JobSiteAdapter {
  id: string
  label: string
  canHandle: (context: JobSiteAdapterContext) => boolean
  capture: (context: JobSiteAdapterContext) => CapturedJob | null
}
