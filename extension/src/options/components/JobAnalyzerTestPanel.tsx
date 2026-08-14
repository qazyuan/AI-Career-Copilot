import type { FormEvent } from 'react'
import type { JobAnalyzerResult } from '../../agents/jobAnalyzer'

interface JobAnalyzerTestPanelProps {
  jdText: string
  result?: JobAnalyzerResult
  errorMessage?: string
  isAnalyzing: boolean
  onJdTextChange: (jdText: string) => void
  onAnalyze: () => void
}

function JobAnalyzerTestPanel({
  jdText,
  result,
  errorMessage,
  isAnalyzing,
  onJdTextChange,
  onAnalyze,
}: JobAnalyzerTestPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAnalyze()
  }

  return (
    <section className="settings-panel" aria-label="Job analyzer test">
      <div className="panel-heading">
        <h2>Job Analyzer Test</h2>
        <p>Paste a job description to verify the first Agent loop.</p>
      </div>
      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Job description</span>
          <textarea
            value={jdText}
            placeholder="Paste a job description here..."
            rows={10}
            onChange={(event) => onJdTextChange(event.target.value)}
          />
        </label>
        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={isAnalyzing || !jdText.trim()}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze JD'}
          </button>
          {errorMessage ? <p className="save-status save-status-error">{errorMessage}</p> : null}
        </div>
      </form>
      {result ? <JobAnalyzerResultView result={result} /> : null}
    </section>
  )
}

function JobAnalyzerResultView({ result }: { result: JobAnalyzerResult }) {
  return (
    <div className="job-result">
      <div className="job-result-grid">
        <ResultItem label="Title" value={result.title} />
        <ResultItem label="Company" value={result.company} />
        <ResultItem label="Location" value={result.location} />
        <ResultItem label="Work mode" value={result.workMode} />
        <ResultItem label="Seniority" value={result.seniority} />
      </div>
      <section>
        <h3>Summary</h3>
        <p>{result.summary ?? 'Not provided'}</p>
      </section>
      <ResultList label="Technical skills" items={result.technicalSkills} />
      <ResultList label="Tools and platforms" items={result.toolsAndPlatforms} />
      <ResultList label="Responsibilities" items={result.responsibilities} />
      <ResultList
        label="Required qualifications"
        items={result.requiredQualifications}
      />
      <ResultList
        label="Preferred qualifications"
        items={result.preferredQualifications}
      />
      <ResultList label="Domain keywords" items={result.domainKeywords} />
      <ResultList label="Uncertainties" items={result.uncertainties} />
    </div>
  )
}

function ResultItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="result-item">
      <span>{label}</span>
      <strong>{value ?? 'Not provided'}</strong>
    </div>
  )
}

function ResultList({ label, items }: { label: string; items: string[] }) {
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

export default JobAnalyzerTestPanel
