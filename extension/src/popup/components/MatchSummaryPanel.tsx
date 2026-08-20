import type { JobAnalyzerResult, JobMatchResult } from '../../agents'

interface MatchSummaryPanelProps {
  jobAnalysis?: JobAnalyzerResult
  matchResult?: JobMatchResult
  matchSkippedReason?: string
}

function MatchSummaryPanel({
  jobAnalysis,
  matchResult,
  matchSkippedReason,
}: MatchSummaryPanelProps) {
  if (!jobAnalysis && !matchResult) {
    return null
  }

  return (
    <section className="panel" aria-label="Match summary">
      {jobAnalysis ? (
        <div className="result-section">
          <h2>Job analysis</h2>
          {matchSkippedReason && !jobAnalysis.title && !jobAnalysis.summary ? (
            <p>No valid job posting detected.</p>
          ) : (
            <>
              <p>{jobAnalysis.title ?? 'Title not provided'}</p>
              <p>{jobAnalysis.summary ?? 'Summary not provided'}</p>
            </>
          )}
        </div>
      ) : null}
      {matchSkippedReason ? (
        <div className="result-section">
          <h2>Match</h2>
          <p>{matchSkippedReason}</p>
        </div>
      ) : null}
      {matchResult ? (
        <div className="result-section">
          <h2>Match</h2>
          <div className="score-row">
            <strong>{matchResult.overallScore}</strong>
            <span>{matchResult.recommendation.replaceAll('_', ' ')}</span>
          </div>
          <p>{matchResult.summary}</p>
          <ResultList
            label="Top strengths"
            items={matchResult.matchedStrengths.slice(0, 3).map((item) => item.requirement)}
          />
          <ResultList
            label="Blocking gaps"
            items={matchResult.blockingGaps.map((item) => item.requirement)}
            emptyLabel="None"
          />
          <ResultList
            label="Risks"
            items={matchResult.risks.slice(0, 3).map((item) => item.risk)}
          />
        </div>
      ) : null}
    </section>
  )
}

function ResultList({
  label,
  items,
  emptyLabel = 'Not provided',
}: {
  label: string
  items: string[]
  emptyLabel?: string
}) {
  return (
    <div className="result-list-block">
      <h3>{label}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </div>
  )
}

export default MatchSummaryPanel
