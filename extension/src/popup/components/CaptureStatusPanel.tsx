import type { CapturedJob } from '../../shared/jobCapture'

interface CaptureStatusPanelProps {
  capturedJob?: CapturedJob
  isLoading: boolean
  errorMessage?: string
  hasResumeProfile: boolean
  onAnalyzeCurrentPage: () => void
}

function CaptureStatusPanel({
  capturedJob,
  isLoading,
  errorMessage,
  hasResumeProfile,
  onAnalyzeCurrentPage,
}: CaptureStatusPanelProps) {
  return (
    <section className="panel" aria-label="Current page capture">
      <div className="panel-heading">
        <h2>Current page</h2>
        <p>{hasResumeProfile ? 'ResumeProfile ready' : 'Analyze your resume first'}</p>
      </div>
      <button
        type="button"
        className="primary-button"
        disabled={isLoading || !hasResumeProfile}
        onClick={onAnalyzeCurrentPage}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Current Page'}
      </button>
      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      {capturedJob ? (
        <div className="capture-preview">
          <strong>{capturedJob.title ?? capturedJob.rawPageTitle}</strong>
          <p>{capturedJob.siteName}</p>
          <p>
            Source: {capturedJob.source}
            {capturedJob.adapterId ? ` (${capturedJob.adapterId})` : ''}
          </p>
          <p>Captured text: {capturedJob.stats.textLength} chars</p>
          <p>Confidence: {capturedJob.metadata.confidence}</p>
          {capturedJob.metadata.extractionWarnings.length > 0 ? (
            <ul>
              {capturedJob.metadata.extractionWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default CaptureStatusPanel
