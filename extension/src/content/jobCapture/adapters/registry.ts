import type { CapturedJob } from '../../../shared/jobCapture'
import { captureJobWithGenericExtractor } from '../genericExtractor'
import { bossAdapter } from './bossAdapter'
import type { JobSiteAdapter, JobSiteAdapterContext } from './types'

const jobSiteAdapters: JobSiteAdapter[] = [bossAdapter]

export function captureJobFromPage(document: Document): CapturedJob {
  const context: JobSiteAdapterContext = {
    document,
    location: window.location,
    capturedAt: new Date().toISOString(),
  }

  const adapter = jobSiteAdapters.find((item) => item.canHandle(context))

  if (!adapter) {
    return captureJobWithGenericExtractor(document)
  }

  try {
    const capturedJob = adapter.capture(context)

    if (capturedJob) {
      return capturedJob
    }
  } catch {
    return captureJobWithGenericExtractorWithAdapterWarning(
      document,
      `${adapter.label} adapter failed. Generic extraction was used.`,
    )
  }

  return captureJobWithGenericExtractorWithAdapterWarning(
    document,
    `${adapter.label} adapter could not reliably extract the job description. Generic extraction was used.`,
  )
}

function captureJobWithGenericExtractorWithAdapterWarning(document: Document, warning: string) {
  const capturedJob = captureJobWithGenericExtractor(document)

  return {
    ...capturedJob,
    metadata: {
      ...capturedJob.metadata,
      extractionWarnings: [...capturedJob.metadata.extractionWarnings, warning],
    },
  }
}
