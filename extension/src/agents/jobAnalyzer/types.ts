export type JobSeniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'unknown'

export type WorkMode = 'onsite' | 'hybrid' | 'remote' | 'unknown'

export interface AnalyzeJobInput {
  jdText: string
}

export interface JobAnalyzerResult {
  title: string | null
  company: string | null
  location: string | null
  workMode: WorkMode
  seniority: JobSeniority
  summary: string | null
  responsibilities: string[]
  requiredQualifications: string[]
  preferredQualifications: string[]
  technicalSkills: string[]
  toolsAndPlatforms: string[]
  domainKeywords: string[]
  uncertainties: string[]
}

export interface AnalyzeJobOutput {
  result: JobAnalyzerResult
  debug?: {
    rawText: string
  }
}
