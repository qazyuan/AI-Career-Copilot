export interface AnalyzeResumeInput {
  resumeText: string
}

export interface ResumeProfile {
  candidate: ResumeCandidate
  summary: string | null
  totalYearsOfExperience: number | null
  statedTargetRoles: string[]
  technicalSkills: string[]
  softSkills: string[]
  toolsAndPlatforms: string[]
  domainKeywords: string[]
  workExperiences: WorkExperience[]
  projects: ResumeProject[]
  education: EducationExperience[]
  certifications: string[]
  languages: string[]
  achievements: string[]
  uncertainties: string[]
}

export interface ResumeCandidate {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  links: string[]
}

export interface WorkExperience {
  company: string | null
  title: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  responsibilities: string[]
  achievements: string[]
  technologies: string[]
}

export interface ResumeProject {
  name: string | null
  role: string | null
  description: string | null
  responsibilities: string[]
  achievements: string[]
  technologies: string[]
}

export interface EducationExperience {
  school: string | null
  degree: string | null
  major: string | null
  startDate: string | null
  endDate: string | null
}

export interface AnalyzeResumeOutput {
  profile: ResumeProfile
  debug?: {
    rawText: string
  }
}
