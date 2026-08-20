import { useEffect, useState } from 'react'
import type { JobAnalyzerResult, JobMatchResult, ResumeProfile } from '../agents'
import { analyzeCapturedJob } from '../services/jobWorkflow'
import { getAIProviderConfig, getResumeProfile } from '../services/storage'
import type { AIProviderConfig } from '../services/ai'
import type { CapturedJob } from '../shared/jobCapture'
import type {
  CaptureCurrentTabJobRequest,
  CaptureCurrentTabJobResponse,
} from '../shared/messages'
import CaptureStatusPanel from './components/CaptureStatusPanel'
import MatchSummaryPanel from './components/MatchSummaryPanel'

function Popup() {
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>()
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile>()
  const [capturedJob, setCapturedJob] = useState<CapturedJob>()
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalyzerResult>()
  const [matchResult, setMatchResult] = useState<JobMatchResult>()
  const [matchSkippedReason, setMatchSkippedReason] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    async function loadState() {
      try {
        const [savedConfig, savedResumeProfile] = await Promise.all([
          getAIProviderConfig(),
          getResumeProfile(),
        ])

        setAiConfig(savedConfig)
        setResumeProfile(savedResumeProfile)
      } catch {
        setErrorMessage('Unable to load extension settings.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadState()
  }, [])

  async function handleAnalyzeCurrentPage() {
    if (!aiConfig) {
      setErrorMessage('Please configure your AI provider in Options first.')
      return
    }

    if (!resumeProfile) {
      setErrorMessage('Please analyze your resume in Options first.')
      return
    }

    setIsAnalyzing(true)
    setErrorMessage(undefined)
    setCapturedJob(undefined)
    setJobAnalysis(undefined)
    setMatchResult(undefined)
    setMatchSkippedReason(undefined)

    try {
      const captureResponse = await chrome.runtime.sendMessage<
        CaptureCurrentTabJobRequest,
        CaptureCurrentTabJobResponse
      >({ type: 'CAPTURE_CURRENT_TAB_JOB' })

      if (!captureResponse?.success || !captureResponse.capturedJob) {
        throw new Error(captureResponse?.error ?? 'Unable to capture this page.')
      }

      setCapturedJob(captureResponse.capturedJob)

      const workflowResult = await analyzeCapturedJob({
        capturedJob: captureResponse.capturedJob,
        resumeProfile,
        aiConfig,
      })

      setJobAnalysis(workflowResult.jobAnalysis)
      setMatchResult(workflowResult.matchResult)
      setMatchSkippedReason(workflowResult.matchSkippedReason)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to analyze the current page.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="popup-shell">
      <header>
        <p className="eyebrow">AI Career Copilot</p>
        <h1>Job assistant</h1>
      </header>
      {isLoading ? (
        <section className="panel" aria-label="Loading status">
          <p>Loading...</p>
        </section>
      ) : (
        <>
          <CaptureStatusPanel
            capturedJob={capturedJob}
            isLoading={isAnalyzing}
            errorMessage={errorMessage}
            hasResumeProfile={Boolean(resumeProfile)}
            onAnalyzeCurrentPage={handleAnalyzeCurrentPage}
          />
          <MatchSummaryPanel
            jobAnalysis={jobAnalysis}
            matchResult={matchResult}
            matchSkippedReason={matchSkippedReason}
          />
        </>
      )}
    </main>
  )
}

export default Popup
