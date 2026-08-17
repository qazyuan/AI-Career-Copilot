import type { JobAnalyzerResult, JobMatchResult, ResumeProfile } from '../../agents'

interface MatchingAgentTestPanelProps {
  resumeProfile?: ResumeProfile
  jobAnalysis?: JobAnalyzerResult
  matchResult?: JobMatchResult
  errorMessage?: string
  isMatching: boolean
  onAnalyzeMatch: () => void
}

function MatchingAgentTestPanel({
  resumeProfile,
  jobAnalysis,
  matchResult,
  errorMessage,
  isMatching,
  onAnalyzeMatch,
}: MatchingAgentTestPanelProps) {
  const canAnalyze = Boolean(resumeProfile && jobAnalysis)

  return (
    <section className="settings-panel" aria-label="Matching agent test">
      <div className="panel-heading">
        <h2>Matching Agent Test</h2>
        <p>Compare the current ResumeProfile with the current JobAnalyzerResult.</p>
      </div>
      <div className="job-result-grid">
        <StatusItem
          label="ResumeProfile"
          value={resumeProfile ? 'Ready' : 'Analyze a resume first'}
        />
        <StatusItem
          label="JobAnalyzerResult"
          value={jobAnalysis ? 'Ready' : 'Analyze a JD first'}
        />
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="primary-button"
          disabled={!canAnalyze || isMatching}
          onClick={onAnalyzeMatch}
        >
          {isMatching ? 'Analyzing...' : 'Analyze Match'}
        </button>
        {isMatching ? (
          <p className="save-status save-status-testing">Analyzing match...</p>
        ) : null}
        {errorMessage ? (
          <p className="save-status save-status-error">{errorMessage}</p>
        ) : null}
      </div>
      {matchResult ? <JobMatchResultPreview result={matchResult} /> : null}
    </section>
  )
}

function JobMatchResultPreview({ result }: { result: JobMatchResult }) {
  return (
    <div className="match-result">
      <div className="job-result-grid">
        <StatusItem label="Overall score" value={String(result.overallScore)} />
        <StatusItem label="Recommendation" value={formatRecommendation(result.recommendation)} />
      </div>
      <section>
        <h3>Summary</h3>
        <p>{result.summary || 'Not provided'}</p>
      </section>
      <section>
        <h3>Score breakdown</h3>
        <div className="score-grid">
          <StatusItem
            label="Technical fit"
            value={String(result.scoreBreakdown.technicalFit)}
          />
          <StatusItem
            label="Experience fit"
            value={String(result.scoreBreakdown.experienceFit)}
          />
          <StatusItem
            label="Domain fit"
            value={String(result.scoreBreakdown.domainFit)}
          />
          <StatusItem
            label="Project fit"
            value={String(result.scoreBreakdown.projectFit)}
          />
          <StatusItem
            label="Requirement fit"
            value={String(result.scoreBreakdown.requirementFit)}
          />
        </div>
      </section>
      <EvidenceList label="Matched strengths" items={result.matchedStrengths} />
      <EvidenceList label="Partial matches" items={result.partialMatches} />
      <TransferableStrengthList items={result.transferableStrengths} />
      <GapList label="Gaps" items={result.gaps} />
      <BlockingGapList items={result.blockingGaps} />
      <RiskList items={result.risks} />
      <RequirementAssessmentList
        label="Must-have assessment"
        items={result.mustHaveAssessment}
      />
      <RequirementAssessmentList
        label="Nice-to-have assessment"
        items={result.niceToHaveAssessment}
      />
      <StringList label="Uncertainties" items={result.uncertainties} />
    </div>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EvidenceList({
  label,
  items,
}: {
  label: string
  items: JobMatchResult['matchedStrengths']
}) {
  return (
    <section>
      <h3>{label}</h3>
      {items.length > 0 ? (
        <div className="resume-record-list">
          {items.map((item, index) => (
            <article className="resume-record" key={`${item.requirement}-${index}`}>
              <strong>{item.requirement}</strong>
              <p>{item.evidenceFromResume}</p>
              <p>{item.explanation}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function TransferableStrengthList({
  items,
}: {
  items: JobMatchResult['transferableStrengths']
}) {
  return (
    <section>
      <h3>Transferable strengths</h3>
      {items.length > 0 ? (
        <div className="resume-record-list">
          {items.map((item, index) => (
            <article
              className="resume-record"
              key={`${item.appliesToRequirement}-${index}`}
            >
              <strong>{item.appliesToRequirement}</strong>
              <p>{item.fromResume}</p>
              <p>{item.transferReason}</p>
              <p>Confidence: {item.confidence}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function GapList({
  label,
  items,
}: {
  label: string
  items: JobMatchResult['gaps']
}) {
  return (
    <section>
      <h3>{label}</h3>
      {items.length > 0 ? (
        <div className="resume-record-list">
          {items.map((item, index) => (
            <article className="resume-record" key={`${item.requirement}-${index}`}>
              <strong>{item.requirement}</strong>
              <p>
                {item.gapType} / {item.severity}
              </p>
              <p>{item.explanation}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function BlockingGapList({ items }: { items: JobMatchResult['blockingGaps'] }) {
  return (
    <section>
      <h3>Blocking gaps</h3>
      {items.length > 0 ? (
        <div className="resume-record-list">
          {items.map((item, index) => (
            <article className="resume-record" key={`${item.requirement}-${index}`}>
              <strong>{item.requirement}</strong>
              <p>Severity: {item.severity}</p>
              <p>{item.reason}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>None</p>
      )}
    </section>
  )
}

function RiskList({ items }: { items: JobMatchResult['risks'] }) {
  return (
    <section>
      <h3>Risks</h3>
      {items.length > 0 ? (
        <div className="resume-record-list">
          {items.map((item, index) => (
            <article className="resume-record" key={`${item.risk}-${index}`}>
              <strong>{item.risk}</strong>
              <p>Severity: {item.severity}</p>
              <p>{item.reason}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function RequirementAssessmentList({
  label,
  items,
}: {
  label: string
  items: JobMatchResult['mustHaveAssessment']
}) {
  return (
    <section>
      <h3>{label}</h3>
      {items.length > 0 ? (
        <div className="resume-record-list">
          {items.map((item, index) => (
            <article className="resume-record" key={`${item.requirement}-${index}`}>
              <strong>{item.requirement}</strong>
              <p>Status: {item.status}</p>
              <p>{item.evidenceFromResume ?? 'Evidence unclear'}</p>
              <p>{item.explanation}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function StringList({ label, items }: { label: string; items: string[] }) {
  return (
    <section>
      <h3>{label}</h3>
      {items.length > 0 ? (
        <ul className="result-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function formatRecommendation(recommendation: JobMatchResult['recommendation']) {
  return recommendation.replaceAll('_', ' ')
}

export default MatchingAgentTestPanel
