import type { JobAnalyzerResult, ResumeProfile } from '..'

export type RecommendationLevel =
  | 'strong_apply'
  | 'apply'
  | 'consider'
  | 'not_recommended'

export type GapType = 'missing' | 'weak' | 'unclear'
export type Severity = 'low' | 'medium' | 'high'
export type RequirementStatus = 'met' | 'partially_met' | 'not_met' | 'unclear'
export type TransferConfidence = 'low' | 'medium' | 'high'

export interface MatchJobInput {
  resumeProfile: ResumeProfile
  jobAnalysis: JobAnalyzerResult
}

export interface JobMatchResult {
  overallScore: number
  recommendation: RecommendationLevel
  summary: string
  scoreBreakdown: MatchScoreBreakdown
  matchedStrengths: MatchEvidence[]
  partialMatches: MatchEvidence[]
  gaps: MatchGap[]
  blockingGaps: BlockingGap[]
  transferableStrengths: TransferableStrength[]
  risks: MatchRisk[]
  mustHaveAssessment: RequirementAssessment[]
  niceToHaveAssessment: RequirementAssessment[]
  uncertainties: string[]
}

export interface MatchScoreBreakdown {
  technicalFit: number
  experienceFit: number
  domainFit: number
  projectFit: number
  requirementFit: number
}

export interface MatchEvidence {
  requirement: string
  evidenceFromResume: string
  explanation: string
}

export interface MatchGap {
  requirement: string
  gapType: GapType
  explanation: string
  severity: Severity
}

export interface BlockingGap {
  requirement: string
  reason: string
  severity: 'medium' | 'high'
  canBeMitigatedByTransferableStrength: boolean
}

export interface TransferableStrength {
  fromResume: string
  appliesToRequirement: string
  transferReason: string
  confidence: TransferConfidence
}

export interface MatchRisk {
  risk: string
  reason: string
  severity: Severity
}

export interface RequirementAssessment {
  requirement: string
  status: RequirementStatus
  evidenceFromResume: string | null
  explanation: string
}

export interface MatchScoreResult {
  overallScore: number
  recommendation: RecommendationLevel
  scoreBreakdown: MatchScoreBreakdown
}

export interface MatchJobOutput {
  result: JobMatchResult
  debug?: {
    rawText: string
  }
}
