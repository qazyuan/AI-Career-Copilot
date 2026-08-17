import { MatchingAgentError } from './errors'
import { calculateMatchScore } from './calculateMatchScore'
import type {
  BlockingGap,
  GapType,
  JobMatchResult,
  MatchEvidence,
  MatchGap,
  MatchRisk,
  MatchScoreBreakdown,
  RequirementAssessment,
  RequirementStatus,
  Severity,
  TransferableStrength,
  TransferConfidence,
} from './types'

const gapTypes: GapType[] = ['missing', 'weak', 'unclear']
const severities: Severity[] = ['low', 'medium', 'high']
const blockingGapSeverities: BlockingGap['severity'][] = ['medium', 'high']
const requirementStatuses: RequirementStatus[] = [
  'met',
  'partially_met',
  'not_met',
  'unclear',
]
const transferConfidences: TransferConfidence[] = ['low', 'medium', 'high']

export function parseJobMatchResponse(content: string): JobMatchResult {
  if (!content.trim()) {
    throw new MatchingAgentError(
      'AI returned an empty match response.',
      'invalid-json',
    )
  }

  const rawJson = extractJson(content)
  let parsed: unknown

  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new MatchingAgentError(
      'AI match response was not valid JSON.',
      'invalid-json',
    )
  }

  if (!isRecord(parsed)) {
    throw new MatchingAgentError(
      'AI match response did not match the expected structure.',
      'invalid-schema',
    )
  }

  const mustHaveAssessment = normalizeRequirementAssessmentConsistency(
    getRequirementAssessments(parsed.mustHaveAssessment),
  )
  const niceToHaveAssessment = normalizeRequirementAssessmentConsistency(
    getRequirementAssessments(parsed.niceToHaveAssessment),
  )
  const normalized = {
    overallScore: 0,
    recommendation: 'not_recommended',
    summary: getString(parsed.summary),
    scoreBreakdown: getScoreBreakdown(parsed.scoreBreakdown),
    matchedStrengths: getMatchEvidenceArray(parsed.matchedStrengths),
    partialMatches: getMatchEvidenceArray(parsed.partialMatches),
    gaps: getGaps(parsed.gaps),
    blockingGaps: getBlockingGaps(parsed.blockingGaps),
    transferableStrengths: getTransferableStrengths(
      parsed.transferableStrengths,
    ),
    risks: getRisks(parsed.risks),
    mustHaveAssessment,
    niceToHaveAssessment,
    uncertainties: getStringArray(parsed.uncertainties),
  } satisfies JobMatchResult
  const consistentResult = enforceMatchConsistency(normalized)
  const calculated = calculateMatchScore(consistentResult)

  return {
    ...consistentResult,
    overallScore: calculated.overallScore,
    recommendation: calculated.recommendation,
    scoreBreakdown: calculated.scoreBreakdown,
  }
}

function enforceMatchConsistency(result: JobMatchResult): JobMatchResult {
  const assessments = [
    ...result.mustHaveAssessment,
    ...result.niceToHaveAssessment,
  ]
  const notMetHardRequirements = result.mustHaveAssessment.filter(
    (assessment) =>
      assessment.status === 'not_met' &&
      isHardBinaryRequirement(assessment.requirement),
  )
  const existingBlockingGaps = result.blockingGaps.filter((blockingGap) => {
    if (blockingGap.canBeMitigatedByTransferableStrength) {
      return false
    }

    const matchingAssessment = result.mustHaveAssessment.find((assessment) =>
      areRelatedRequirements(blockingGap.requirement, assessment.requirement),
    )

    if (!matchingAssessment) {
      return true
    }

    return matchingAssessment.status === 'not_met'
  })
  const synthesizedBlockingGaps = notMetHardRequirements
    .filter(
      (assessment) =>
        !existingBlockingGaps.some((gap) =>
          areRelatedRequirements(gap.requirement, assessment.requirement),
        ),
    )
    .map((assessment) => ({
      requirement: assessment.requirement,
      reason:
        assessment.explanation ||
        'This is an explicit must-have requirement with no matching resume evidence.',
      severity: 'high' as const,
      canBeMitigatedByTransferableStrength: false,
    }))

  return {
    ...result,
    partialMatches: result.partialMatches.filter(
      (partialMatch) =>
        !notMetHardRequirements.some((assessment) =>
          areRelatedRequirements(partialMatch.requirement, assessment.requirement),
        ),
    ),
    transferableStrengths: result.transferableStrengths.filter(
      (strength) =>
        !notMetHardRequirements.some((assessment) =>
          areRelatedRequirements(
            strength.appliesToRequirement,
            assessment.requirement,
          ),
        ),
    ),
    gaps: result.gaps.filter((gap) => {
      const matchingAssessment = assessments.find((assessment) =>
        areRelatedRequirements(gap.requirement, assessment.requirement),
      )

      return matchingAssessment?.status !== 'met'
    }),
    blockingGaps: [...existingBlockingGaps, ...synthesizedBlockingGaps],
  }
}

function normalizeRequirementAssessmentConsistency(
  assessments: RequirementAssessment[],
): RequirementAssessment[] {
  return assessments.map((assessment) => {
    if (
      assessment.status === 'not_met' &&
      isLocationOrAuthorizationRequirement(assessment.requirement) &&
      isBasedOnMissingEvidence(assessment)
    ) {
      return {
        ...assessment,
        status: 'unclear',
      }
    }

    return assessment
  })
}

function getScoreBreakdown(value: unknown): MatchScoreBreakdown {
  const scoreBreakdown = isRecord(value) ? value : {}

  return {
    technicalFit: getNumber(scoreBreakdown.technicalFit),
    experienceFit: getNumber(scoreBreakdown.experienceFit),
    domainFit: getNumber(scoreBreakdown.domainFit),
    projectFit: getNumber(scoreBreakdown.projectFit),
    requirementFit: getNumber(scoreBreakdown.requirementFit),
  }
}

function getMatchEvidenceArray(value: unknown): MatchEvidence[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((item) => ({
    requirement: getString(item.requirement),
    evidenceFromResume: getString(item.evidenceFromResume),
    explanation: getString(item.explanation),
  }))
}

function getGaps(value: unknown): MatchGap[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((gap) => ({
    requirement: getString(gap.requirement),
    gapType: getEnumValue(gap.gapType, gapTypes, 'unclear'),
    explanation: getString(gap.explanation),
    severity: getEnumValue(gap.severity, severities, 'medium'),
  }))
}

function getBlockingGaps(value: unknown): BlockingGap[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((gap) => ({
    requirement: getString(gap.requirement),
    reason: getString(gap.reason),
    severity: getEnumValue(gap.severity, blockingGapSeverities, 'medium'),
    canBeMitigatedByTransferableStrength:
      gap.canBeMitigatedByTransferableStrength === true,
  }))
}

function getTransferableStrengths(value: unknown): TransferableStrength[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((strength) => ({
    fromResume: getString(strength.fromResume),
    appliesToRequirement: getString(strength.appliesToRequirement),
    transferReason: getString(strength.transferReason),
    confidence: getEnumValue(strength.confidence, transferConfidences, 'medium'),
  }))
}

function getRisks(value: unknown): MatchRisk[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((risk) => ({
    risk: getString(risk.risk),
    reason: getString(risk.reason),
    severity: getEnumValue(risk.severity, severities, 'medium'),
  }))
}

function getRequirementAssessments(value: unknown): RequirementAssessment[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord).map((assessment) => ({
    requirement: getString(assessment.requirement),
    status: getEnumValue(assessment.status, requirementStatuses, 'unclear'),
    evidenceFromResume: getNullableString(assessment.evidenceFromResume),
    explanation: getString(assessment.explanation),
  }))
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

function getString(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function getNullableString(value: unknown) {
  const stringValue = getString(value)

  return stringValue || null
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

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function getEnumValue<T extends string>(
  value: unknown,
  allowedValues: T[],
  fallback: T,
) {
  if (typeof value === 'string' && allowedValues.includes(value as T)) {
    return value as T
  }

  return fallback
}

function areRelatedRequirements(firstRequirement: string, secondRequirement: string) {
  const first = normalizeRequirement(firstRequirement)
  const second = normalizeRequirement(secondRequirement)

  if (!first || !second) {
    return false
  }

  return first.includes(second) || second.includes(first)
}

function normalizeRequirement(requirement: string) {
  return requirement
    .toLowerCase()
    .replaceAll(/\s/g, '')
    .replaceAll('必须', '')
    .replaceAll('需要', '')
    .replaceAll('要求', '')
    .replaceAll('具备', '')
    .replaceAll('持有', '')
}

function isLocationOrAuthorizationRequirement(requirement: string) {
  const normalized = normalizeRequirement(requirement)

  return (
    normalized.includes('工作许可') ||
    normalized.includes('workauthorization') ||
    normalized.includes('visa') ||
    normalized.includes('签证') ||
    normalized.includes('onsite') ||
    normalized.includes('现场办公') ||
    normalized.includes('工作地点') ||
    normalized.includes('纽约') ||
    normalized.includes('newyork') ||
    normalized.includes('remote') ||
    normalized.includes('远程')
  )
}

function isHardBinaryRequirement(requirement: string) {
  const normalized = normalizeRequirement(requirement)

  return (
    normalized.includes('证书') ||
    normalized.includes('certification') ||
    normalized.includes('certificate') ||
    normalized.includes('professional')
  )
}

function isBasedOnMissingEvidence(assessment: RequirementAssessment) {
  const text = [
    assessment.evidenceFromResume ?? '',
    assessment.explanation,
  ].join(' ')

  return (
    /未提及|无.*证据|无.*信息|无法确认|没有.*证据|not mention|not provided|no evidence|unclear/i.test(
      text,
    ) && !/明确不能|不愿|不能|无法满足|不接受|only remote|cannot|not willing/i.test(text)
  )
}
