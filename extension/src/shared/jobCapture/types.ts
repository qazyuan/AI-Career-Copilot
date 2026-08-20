export type CaptureSource = 'generic' | 'adapter'

export interface CapturedJob {
  url: string
  title: string | null
  siteName: string | null
  capturedAt: string
  source: CaptureSource
  adapterId: string | null
  contentText: string
  rawPageTitle: string
  metadata: CapturedJobMetadata
  stats: CapturedJobStats
}

export interface CapturedJobMetadata {
  company?: string | null
  location?: string | null
  salary?: string | null
  jobTitle?: string | null
  confidence: 'low' | 'medium' | 'high'
  extractionWarnings: string[]
}

export interface CapturedJobStats {
  textLength: number
  textBlockCount: number
}
