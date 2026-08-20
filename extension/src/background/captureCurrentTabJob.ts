import type {
  CaptureCurrentTabJobResponse,
  CaptureJobFromPageResponse,
} from '../shared/messages'

export async function captureCurrentTabJob(): Promise<CaptureCurrentTabJobResponse> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!tab?.id || !tab.url) {
    return {
      type: 'CAPTURE_CURRENT_TAB_JOB_RESPONSE',
      success: false,
      error: 'No active tab is available.',
    }
  }

  if (!isSupportedPageUrl(tab.url)) {
    return {
      type: 'CAPTURE_CURRENT_TAB_JOB_RESPONSE',
      success: false,
      error: 'This page cannot be accessed by the extension.',
    }
  }

  try {
    const response = await chrome.tabs.sendMessage<
      { type: 'CAPTURE_JOB_FROM_PAGE' },
      CaptureJobFromPageResponse
    >(tab.id, { type: 'CAPTURE_JOB_FROM_PAGE' })

    if (!response?.success || !response.capturedJob) {
      return {
        type: 'CAPTURE_CURRENT_TAB_JOB_RESPONSE',
        success: false,
        error: response?.error ?? 'Unable to capture this page.',
      }
    }

    return {
      type: 'CAPTURE_CURRENT_TAB_JOB_RESPONSE',
      success: true,
      capturedJob: response.capturedJob,
    }
  } catch {
    return {
      type: 'CAPTURE_CURRENT_TAB_JOB_RESPONSE',
      success: false,
      error: 'Unable to capture this page. Please refresh the page and try again.',
    }
  }
}

function isSupportedPageUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://')
}
