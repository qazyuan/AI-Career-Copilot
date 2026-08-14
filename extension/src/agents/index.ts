export type AgentName =
  | 'resume'
  | 'jobAnalyzer'
  | 'matching'
  | 'interview'

export { JobAnalyzerAgent } from './jobAnalyzer'
export { ResumeAgent } from './resume'
export type {
  AnalyzeJobInput,
  AnalyzeJobOutput,
  JobAnalyzerResult,
  JobSeniority,
  WorkMode,
} from './jobAnalyzer'
export type {
  AnalyzeResumeInput,
  AnalyzeResumeOutput,
  EducationExperience,
  ResumeCandidate,
  ResumeProfile,
  ResumeProject,
  WorkExperience,
} from './resume'
