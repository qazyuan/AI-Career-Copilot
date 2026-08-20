import { JobAnalyzerAgent, MatchingAgent } from '../../agents'
import type { JobAnalyzerResult, JobMatchResult, ResumeProfile } from '../../agents'
import type { AIProviderConfig } from '../ai'
import { createAIProvider } from '../ai'
import type { CapturedJob } from '../../shared/jobCapture'

export interface AnalyzeCapturedJobInput {
  capturedJob: CapturedJob
  resumeProfile: ResumeProfile
  aiConfig: AIProviderConfig
}

export interface AnalyzeCapturedJobResult {
  jobAnalysis: JobAnalyzerResult
  matchResult?: JobMatchResult
  matchSkippedReason?: string
}

export async function analyzeCapturedJob({
  capturedJob,
  resumeProfile,
  aiConfig,
}: AnalyzeCapturedJobInput): Promise<AnalyzeCapturedJobResult> {
  const provider = createAIProvider(aiConfig)
  const jobAnalyzer = new JobAnalyzerAgent(provider)
  const jobOutput = await jobAnalyzer.analyze({
    jdText: capturedJob.contentText,
  })

  if (!isValidJobAnalysis(jobOutput.result)) {
    return {
      jobAnalysis: jobOutput.result,
      matchSkippedReason:
        'The captured page does not look like a valid job posting. Matching was skipped.',
    }
  }

  const matchingAgent = new MatchingAgent(provider)
  const matchOutput = await matchingAgent.match({
    resumeProfile,
    jobAnalysis: jobOutput.result,
  })

  return {
    jobAnalysis: jobOutput.result,
    matchResult: matchOutput.result,
  }
}

function isValidJobAnalysis(jobAnalysis: JobAnalyzerResult) {
  const structuredSignalCount = [
    jobAnalysis.title,
    jobAnalysis.summary,
    jobAnalysis.responsibilities.length > 0,
    jobAnalysis.requiredQualifications.length > 0,
    jobAnalysis.technicalSkills.length > 0,
    jobAnalysis.domainKeywords.length > 0,
  ].filter(Boolean).length

  return structuredSignalCount >= 2
}
