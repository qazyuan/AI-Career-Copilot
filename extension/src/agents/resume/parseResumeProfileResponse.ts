import { ResumeAgentError } from './errors'
import type {
  EducationExperience,
  ResumeCandidate,
  ResumeProfile,
  ResumeProject,
  WorkExperience,
} from './types'

export function parseResumeProfileResponse(content: string): ResumeProfile {
  if (!content.trim()) {
    throw new ResumeAgentError(
      'AI returned an empty response. Try a non-reasoning chat model or increase the output token limit.',
      'invalid-json',
    )
  }

  const rawJson = extractJson(content)
  let parsed: unknown

  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new ResumeAgentError('AI response was not valid JSON.', 'invalid-json')
  }

  if (!isRecord(parsed)) {
    throw new ResumeAgentError(
      'AI response did not match the expected structure.',
      'invalid-schema',
    )
  }

  return {
    candidate: getCandidate(parsed.candidate),
    summary: getNullableString(parsed.summary),
    totalYearsOfExperience: getNullableNumber(parsed.totalYearsOfExperience),
    statedTargetRoles: getStringArray(parsed.statedTargetRoles),
    technicalSkills: getStringArray(parsed.technicalSkills),
    softSkills: getStringArray(parsed.softSkills),
    toolsAndPlatforms: getStringArray(parsed.toolsAndPlatforms),
    domainKeywords: getStringArray(parsed.domainKeywords),
    workExperiences: getWorkExperiences(parsed.workExperiences),
    projects: getProjects(parsed.projects),
    education: getEducation(parsed.education),
    certifications: getStringArray(parsed.certifications),
    languages: getStringArray(parsed.languages),
    achievements: getStringArray(parsed.achievements),
    uncertainties: getStringArray(parsed.uncertainties),
  }
}

function extractJson(content: string) {
  const trimmed = content.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const jsonObject = extractFirstJsonObject(trimmed)

  return jsonObject ?? trimmed
}

function extractFirstJsonObject(content: string) {
  const startIndex = content.indexOf('{')

  if (startIndex === -1) {
    return undefined
  }

  let depth = 0
  let isInsideString = false
  let isEscaped = false

  for (let index = startIndex; index < content.length; index += 1) {
    const character = content[index]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (character === '\\') {
      isEscaped = true
      continue
    }

    if (character === '"') {
      isInsideString = !isInsideString
      continue
    }

    if (isInsideString) {
      continue
    }

    if (character === '{') {
      depth += 1
    }

    if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return content.slice(startIndex, index + 1)
      }
    }
  }

  return undefined
}

function getCandidate(value: unknown): ResumeCandidate {
  const candidate = isRecord(value) ? value : {}

  return {
    name: getNullableString(candidate.name),
    email: getNullableString(candidate.email),
    phone: getNullableString(candidate.phone),
    location: getNullableString(candidate.location),
    links: getStringArray(candidate.links),
  }
}

function getWorkExperiences(value: unknown): WorkExperience[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((experience) => ({
    company: getNullableString(experience.company),
    title: getNullableString(experience.title),
    location: getNullableString(experience.location),
    startDate: getNullableString(experience.startDate),
    endDate: getNullableString(experience.endDate),
    responsibilities: getStringArray(experience.responsibilities),
    achievements: getStringArray(experience.achievements),
    technologies: getStringArray(experience.technologies),
  }))
}

function getProjects(value: unknown): ResumeProject[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((project) => ({
    name: getNullableString(project.name),
    role: getNullableString(project.role),
    description: getNullableString(project.description),
    responsibilities: getStringArray(project.responsibilities),
    achievements: getStringArray(project.achievements),
    technologies: getStringArray(project.technologies),
  }))
}

function getEducation(value: unknown): EducationExperience[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((education) => ({
    school: getNullableString(education.school),
    degree: getNullableString(education.degree),
    major: getNullableString(education.major),
    startDate: getNullableString(education.startDate),
    endDate: getNullableString(education.endDate),
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNullableString(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed ? trimmed : null
  }

  return null
}

function getNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}
