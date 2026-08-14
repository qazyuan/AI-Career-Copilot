import type { ChangeEvent } from 'react'
import type { ResumeProfile } from '../../agents'
import type { ParsedResumeText } from '../../services/resumePdf'

interface ResumePdfTextPanelProps {
  parsedResume?: ParsedResumeText
  resumeProfile?: ResumeProfile
  errorMessage?: string
  isExtracting: boolean
  isAnalyzing: boolean
  onFileSelect: (file: File) => void
  onAnalyze: () => void
  onClear: () => void
}

function ResumePdfTextPanel({
  parsedResume,
  resumeProfile,
  errorMessage,
  isExtracting,
  isAnalyzing,
  onFileSelect,
  onAnalyze,
  onClear,
}: ResumePdfTextPanelProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (file) {
      onFileSelect(file)
    }

    event.target.value = ''
  }

  return (
    <section className="settings-panel" aria-label="Resume PDF text extraction">
      <div className="panel-heading">
        <h2>Resume PDF Text Extraction</h2>
        <p>Upload a text-based PDF resume and preview the locally extracted text.</p>
      </div>
      <div className="settings-form">
        <label className="field">
          <span>PDF resume</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={isExtracting}
            onChange={handleFileChange}
          />
        </label>
        <div className="form-actions">
          <button
            type="button"
            className="primary-button"
            disabled={!parsedResume || isExtracting || isAnalyzing}
            onClick={onAnalyze}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={(!parsedResume && !resumeProfile) || isExtracting || isAnalyzing}
            onClick={onClear}
          >
            Clear
          </button>
          {isExtracting ? (
            <p className="save-status save-status-testing">Extracting PDF text...</p>
          ) : null}
          {isAnalyzing ? (
            <p className="save-status save-status-testing">Analyzing resume...</p>
          ) : null}
          {errorMessage ? (
            <p className="save-status save-status-error">{errorMessage}</p>
          ) : null}
        </div>
      </div>
      {parsedResume ? <ResumeTextPreview parsedResume={parsedResume} /> : null}
      {resumeProfile ? <ResumeProfilePreview profile={resumeProfile} /> : null}
    </section>
  )
}

function ResumeTextPreview({ parsedResume }: { parsedResume: ParsedResumeText }) {
  return (
    <div className="resume-preview">
      <div className="job-result-grid">
        <div className="result-item">
          <span>File</span>
          <strong>{parsedResume.fileName}</strong>
        </div>
        <div className="result-item">
          <span>Pages</span>
          <strong>{String(parsedResume.pageCount)}</strong>
        </div>
      </div>
      <label className="field">
        <span>Extracted text preview</span>
        <textarea readOnly value={parsedResume.text} rows={14} />
      </label>
    </div>
  )
}

function ResumeProfilePreview({ profile }: { profile: ResumeProfile }) {
  return (
    <div className="resume-profile">
      <div className="job-result-grid">
        <ResultItem label="Name" value={profile.candidate.name} />
        <ResultItem label="Email" value={profile.candidate.email} />
        <ResultItem label="Phone" value={profile.candidate.phone} />
        <ResultItem label="Location" value={profile.candidate.location} />
        <ResultItem
          label="Experience"
          value={
            profile.totalYearsOfExperience === null
              ? null
              : `${profile.totalYearsOfExperience} years`
          }
        />
      </div>
      <section>
        <h3>Summary</h3>
        <p>{profile.summary ?? 'Not provided'}</p>
      </section>
      <ResultList label="Stated target roles" items={profile.statedTargetRoles} />
      <ResultList label="Technical skills" items={profile.technicalSkills} />
      <ResultList label="Soft skills" items={profile.softSkills} />
      <ResultList label="Tools and platforms" items={profile.toolsAndPlatforms} />
      <ResultList label="Domain keywords" items={profile.domainKeywords} />
      <ResultList label="Achievements" items={profile.achievements} />
      <ResumeWorkExperienceList experiences={profile.workExperiences} />
      <ResumeProjectList projects={profile.projects} />
      <ResumeEducationList education={profile.education} />
      <ResultList label="Certifications" items={profile.certifications} />
      <ResultList label="Languages" items={profile.languages} />
      <ResultList label="Uncertainties" items={profile.uncertainties} />
    </div>
  )
}

function ResumeWorkExperienceList({
  experiences,
}: {
  experiences: ResumeProfile['workExperiences']
}) {
  return (
    <section>
      <h3>Work experiences</h3>
      {experiences.length > 0 ? (
        <div className="resume-record-list">
          {experiences.map((experience, index) => (
            <article className="resume-record" key={`${experience.company}-${index}`}>
              <strong>{experience.title ?? 'Not provided'}</strong>
              <p>{experience.company ?? 'Company not provided'}</p>
              <p>
                {[experience.startDate, experience.endDate]
                  .filter(Boolean)
                  .join(' - ') || 'Dates not provided'}
              </p>
              <ResultList label="Responsibilities" items={experience.responsibilities} />
              <ResultList label="Achievements" items={experience.achievements} />
              <ResultList label="Technologies" items={experience.technologies} />
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function ResumeProjectList({ projects }: { projects: ResumeProfile['projects'] }) {
  return (
    <section>
      <h3>Projects</h3>
      {projects.length > 0 ? (
        <div className="resume-record-list">
          {projects.map((project, index) => (
            <article className="resume-record" key={`${project.name}-${index}`}>
              <strong>{project.name ?? 'Not provided'}</strong>
              <p>{project.role ?? 'Role not provided'}</p>
              <p>{project.description ?? 'Description not provided'}</p>
              <ResultList label="Responsibilities" items={project.responsibilities} />
              <ResultList label="Achievements" items={project.achievements} />
              <ResultList label="Technologies" items={project.technologies} />
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
  )
}

function ResumeEducationList({
  education,
}: {
  education: ResumeProfile['education']
}) {
  return (
    <section>
      <h3>Education</h3>
      {education.length > 0 ? (
        <div className="resume-record-list">
          {education.map((item, index) => (
            <article className="resume-record" key={`${item.school}-${index}`}>
              <strong>{item.school ?? 'Not provided'}</strong>
              <p>{[item.degree, item.major].filter(Boolean).join(' / ')}</p>
              <p>
                {[item.startDate, item.endDate].filter(Boolean).join(' - ') ||
                  'Dates not provided'}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </section>
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

export default ResumePdfTextPanel
