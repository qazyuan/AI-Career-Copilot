import { captureCurrentTabJob } from './captureCurrentTabJob'
import type {
  CaptureCurrentTabJobRequest,
  CaptureCurrentTabJobResponse,
} from '../shared/messages'

chrome.runtime.onInstalled.addListener(() => {
  console.info('AI Career Copilot installed')
})

chrome.runtime.onMessage.addListener(
  (
    message: CaptureCurrentTabJobRequest,
    _sender,
    sendResponse: (response: CaptureCurrentTabJobResponse) => void,
  ) => {
    if (message.type !== 'CAPTURE_CURRENT_TAB_JOB') {
      return false
    }

    void captureCurrentTabJob().then(sendResponse)

    return true
  },
)
