import type {
  CaptureJobFromPageRequest,
  CaptureJobFromPageResponse,
} from '../shared/messages'
import { captureJobFromPage } from './jobCapture'

const pageStableDelayMs = 400

chrome.runtime.onMessage.addListener(
  (
    message: CaptureJobFromPageRequest,
    _sender,
    sendResponse: (response: CaptureJobFromPageResponse) => void,
  ) => {
    if (message.type !== 'CAPTURE_JOB_FROM_PAGE') {
      return false
    }

    captureStableCurrentPage()
      .then((capturedJob) => {
        sendResponse({
          type: 'CAPTURE_JOB_FROM_PAGE_RESPONSE',
          success: true,
          capturedJob,
        })
      })
      .catch((error: unknown) => {
        sendResponse({
          type: 'CAPTURE_JOB_FROM_PAGE_RESPONSE',
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to capture this page.',
        })
      })

    return true
  },
)

async function captureStableCurrentPage() {
  const startUrl = window.location.href

  await wait(pageStableDelayMs)

  const capturedJob = captureJobFromPage(document)

  if (startUrl === window.location.href) {
    return capturedJob
  }

  await wait(pageStableDelayMs)

  return captureJobFromPage(document)
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}
