import type {
  BlockingGap,
  JobMatchResult,
  MatchScoreBreakdown,
  MatchScoreResult,
  RecommendationLevel,
} from './types'

const recommendationRank: Record<RecommendationLevel, number> = {
  not_recommended: 0,
  consider: 1,
  apply: 2,
  strong_apply: 3,
}

const recommendationByRank: RecommendationLevel[] = [
  'not_recommended',
  'consider',
  'apply',
  'strong_apply',
]

const scoreWeights = {
  technicalFit: 0.3,
  experienceFit: 0.2,
  domainFit: 0.15,
  projectFit: 0.15,
  requirementFit: 0.2,
} satisfies Record<keyof MatchScoreBreakdown, number>

export function calculateMatchScore(
  result: Pick<JobMatchResult, 'scoreBreakdown' | 'blockingGaps'>,
): MatchScoreResult {
  const scoreBreakdown = normalizeScoreBreakdown(result.scoreBreakdown)
  const overallScore = Math.round(
    scoreBreakdown.technicalFit * scoreWeights.technicalFit +
      scoreBreakdown.experienceFit * scoreWeights.experienceFit +
      scoreBreakdown.domainFit * scoreWeights.domainFit +
      scoreBreakdown.projectFit * scoreWeights.projectFit +
      scoreBreakdown.requirementFit * scoreWeights.requirementFit,
  )
  const baseRecommendation = getBaseRecommendation(overallScore)
  const recommendation = applyBlockingGapCap(
    baseRecommendation,
    result.blockingGaps,
  )

  return {
    overallScore,
    recommendation,
    scoreBreakdown,
  }
}

export function normalizeScoreBreakdown(
  scoreBreakdown: MatchScoreBreakdown,
): MatchScoreBreakdown {
  const clamped = {
    technicalFit: clampScore(scoreBreakdown.technicalFit),
    experienceFit: clampScore(scoreBreakdown.experienceFit),
    domainFit: clampScore(scoreBreakdown.domainFit),
    projectFit: clampScore(scoreBreakdown.projectFit),
    requirementFit: clampScore(scoreBreakdown.requirementFit),
  }

  if (looksLikeWeightedContribution(clamped)) {
    return {
      technicalFit: contributionToRawScore(
        clamped.technicalFit,
        scoreWeights.technicalFit,
      ),
      experienceFit: contributionToRawScore(
        clamped.experienceFit,
        scoreWeights.experienceFit,
      ),
      domainFit: contributionToRawScore(clamped.domainFit, scoreWeights.domainFit),
      projectFit: contributionToRawScore(
        clamped.projectFit,
        scoreWeights.projectFit,
      ),
      requirementFit: contributionToRawScore(
        clamped.requirementFit,
        scoreWeights.requirementFit,
      ),
    }
  }

  return clamped
}

function looksLikeWeightedContribution(scoreBreakdown: MatchScoreBreakdown) {
  return (
    scoreBreakdown.technicalFit <= scoreWeights.technicalFit * 100 &&
    scoreBreakdown.experienceFit <= scoreWeights.experienceFit * 100 &&
    scoreBreakdown.domainFit <= scoreWeights.domainFit * 100 &&
    scoreBreakdown.projectFit <= scoreWeights.projectFit * 100 &&
    scoreBreakdown.requirementFit <= scoreWeights.requirementFit * 100
  )
}

function contributionToRawScore(value: number, weight: number) {
  return clampScore(value / weight)
}

function getBaseRecommendation(score: number): RecommendationLevel {
  if (score >= 85) {
    return 'strong_apply'
  }

  if (score >= 70) {
    return 'apply'
  }

  if (score >= 55) {
    return 'consider'
  }

  return 'not_recommended'
}

function applyBlockingGapCap(
  recommendation: RecommendationLevel,
  blockingGaps: BlockingGap[],
): RecommendationLevel {
  const hasHighBlockingGap = blockingGaps.some(
    (gap) => gap.severity === 'high',
  )
  const hasMediumBlockingGap = blockingGaps.some(
    (gap) => gap.severity === 'medium',
  )

  if (hasHighBlockingGap) {
    return minRecommendation(recommendation, 'consider')
  }

  if (hasMediumBlockingGap) {
    return minRecommendation(recommendation, 'apply')
  }

  return recommendation
}

function minRecommendation(
  recommendation: RecommendationLevel,
  cap: RecommendationLevel,
) {
  return recommendationByRank[
    Math.min(recommendationRank[recommendation], recommendationRank[cap])
  ]
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}
