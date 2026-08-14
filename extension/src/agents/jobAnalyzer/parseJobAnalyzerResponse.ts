import { JobAnalyzerError } from './errors'
import type { JobAnalyzerResult, JobSeniority, WorkMode } from './types'

const workModes: WorkMode[] = ['onsite', 'hybrid', 'remote', 'unknown']
const seniorities: JobSeniority[] = [
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'manager',
  'unknown',
]

export function parseJobAnalyzerResponse(content: string): JobAnalyzerResult {
  if (!content.trim()) {
    throw new JobAnalyzerError(
      'AI returned an empty response. Try a non-reasoning chat model or increase the output token limit.',
      'invalid-json',
    )
  }

  const rawJson = extractJson(content)
  let parsed: unknown

  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new JobAnalyzerError('AI response was not valid JSON.', 'invalid-json')
  }

  if (!isRecord(parsed)) {
    throw new JobAnalyzerError(
      'AI response did not match the expected structure.',
      'invalid-schema',
    )
  }

  return {
    title: getNullableString(parsed.title),
    company: getNullableString(parsed.company),
    location: getNullableString(parsed.location),
    workMode: getEnumValue(parsed.workMode, workModes),
    seniority: getEnumValue(parsed.seniority, seniorities),
    summary: getNullableString(parsed.summary),
    responsibilities: getStringArray(parsed.responsibilities),
    requiredQualifications: getStringArray(parsed.requiredQualifications),
    preferredQualifications: getStringArray(parsed.preferredQualifications),
    technicalSkills: getStringArray(parsed.technicalSkills),
    toolsAndPlatforms: getStringArray(parsed.toolsAndPlatforms),
    domainKeywords: getStringArray(parsed.domainKeywords),
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

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getEnumValue<T extends string>(value: unknown, allowedValues: T[]) {
  if (typeof value === 'string' && allowedValues.includes(value as T)) {
    return value as T
  }

  return 'unknown' as T
}
