import { useEffect, useState } from 'react'
import { JobAnalyzerAgent, MatchingAgent, ResumeAgent } from '../agents'
import type { JobAnalyzerResult, JobMatchResult, ResumeProfile } from '../agents'
import type { AIProviderConfig } from '../services/ai'
import {
  createAIProvider,
  getProviderDefinition,
  testAIProviderConnection,
} from '../services/ai'
import type { ParsedResumeText } from '../services/resumePdf'
import { extractTextFromPdf } from '../services/resumePdf'
import {
  getAIProviderConfig,
  getResumeProfile,
  saveAIProviderConfig,
  saveResumeProfile,
} from '../services/storage'
import JobAnalyzerTestPanel from './components/JobAnalyzerTestPanel'
import MatchingAgentTestPanel from './components/MatchingAgentTestPanel'
import ProviderSettingsForm from './components/ProviderSettingsForm'
import ResumePdfTextPanel from './components/ResumePdfTextPanel'
import type { SaveStatusValue } from './components/SaveStatus'

const defaultProvider = getProviderDefinition('deepseek')

const defaultConfig: AIProviderConfig = {
  provider: defaultProvider.id,
  apiKey: '',
  model: defaultProvider.defaultModel,
  baseUrl: defaultProvider.defaultBaseUrl,
}

function Options() {
  const [config, setConfig] = useState<AIProviderConfig>(defaultConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatusValue>('idle')
  const [statusMessage, setStatusMessage] = useState<string>()
  const [jdText, setJdText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [jobAnalyzerResult, setJobAnalyzerResult] =
    useState<JobAnalyzerResult>()
  const [jobAnalyzerError, setJobAnalyzerError] = useState<string>()
  const [parsedResume, setParsedResume] = useState<ParsedResumeText>()
  const [isExtractingResumePdf, setIsExtractingResumePdf] = useState(false)
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false)
  const [resumePdfError, setResumePdfError] = useState<string>()
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile>()
  const [isMatching, setIsMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<JobMatchResult>()
  const [matchError, setMatchError] = useState<string>()

  useEffect(() => {
    let isMounted = true

    async function loadConfig() {
      try {
        const savedConfig = await getAIProviderConfig()

        if (isMounted && savedConfig) {
          setConfig(savedConfig)
        }

        const savedResumeProfile = await getResumeProfile()

        if (isMounted && savedResumeProfile) {
          setResumeProfile(savedResumeProfile)
        }
      } catch {
        if (isMounted) {
          setSaveStatus('error')
          setStatusMessage('Unable to load saved settings.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadConfig()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSave() {
    setIsSaving(true)
    setSaveStatus('idle')
    setStatusMessage(undefined)

    try {
      await saveAIProviderConfig(config)
      setSaveStatus('saved')
      setStatusMessage('Settings saved locally.')
    } catch {
      setSaveStatus('error')
      setStatusMessage('Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestConnection() {
    setIsTesting(true)
    setSaveStatus('testing')
    setStatusMessage('Testing connection...')

    const result = await testAIProviderConnection(config)

    setSaveStatus(result.success ? 'saved' : 'error')
    setStatusMessage(result.message)
    setIsTesting(false)
  }

  async function handleAnalyzeJob() {
    setIsAnalyzing(true)
    setJobAnalyzerResult(undefined)
    setJobAnalyzerError(undefined)

    try {
      const provider = createAIProvider(config)
      const agent = new JobAnalyzerAgent(provider)
      const output = await agent.analyze({ jdText })

      setJobAnalyzerResult(output.result)
      setMatchResult(undefined)
      setMatchError(undefined)
    } catch (error) {
      setJobAnalyzerError(
        error instanceof Error
          ? error.message
          : 'Unable to analyze this job description.',
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleResumePdfSelect(file: File) {
    setIsExtractingResumePdf(true)
    setParsedResume(undefined)
    setResumePdfError(undefined)

    try {
      const parsedText = await extractTextFromPdf(file)

      setParsedResume(parsedText)
      setResumeProfile(undefined)
    } catch (error) {
      setResumePdfError(
        error instanceof Error
          ? error.message
          : 'Unable to extract text from this PDF.',
      )
    } finally {
      setIsExtractingResumePdf(false)
    }
  }

  async function handleAnalyzeResume() {
    if (!parsedResume) {
      setResumePdfError('Please upload and extract a PDF resume first.')
      return
    }

    setIsAnalyzingResume(true)
    setResumePdfError(undefined)

    try {
      const provider = createAIProvider(config)
      const agent = new ResumeAgent(provider)
      const output = await agent.analyze({ resumeText: parsedResume.text })

      setResumeProfile(output.profile)
      setMatchResult(undefined)
      setMatchError(undefined)
      await saveResumeProfile(output.profile)
    } catch (error) {
      setResumePdfError(
        error instanceof Error ? error.message : 'Unable to analyze this resume.',
      )
    } finally {
      setIsAnalyzingResume(false)
    }
  }

  async function handleAnalyzeMatch() {
    if (!resumeProfile || !jobAnalyzerResult) {
      setMatchError('Please analyze both a resume and a job description first.')
      return
    }

    setIsMatching(true)
    setMatchResult(undefined)
    setMatchError(undefined)

    try {
      const provider = createAIProvider(config)
      const agent = new MatchingAgent(provider)
      const output = await agent.match({
        resumeProfile,
        jobAnalysis: jobAnalyzerResult,
      })

      setMatchResult(output.result)
    } catch (error) {
      setMatchError(
        error instanceof Error ? error.message : 'Unable to analyze this match.',
      )
    } finally {
      setIsMatching(false)
    }
  }

  return (
    <main className="options-shell">
      <header>
        <p className="eyebrow">Settings</p>
        <h1>AI Career Copilot</h1>
      </header>
      <section className="settings-panel" aria-label="Extension settings">
        <div className="panel-heading">
          <h2>Provider configuration</h2>
          <p>Connect the extension to an AI provider using your own API key.</p>
        </div>
        {isLoading ? (
          <p className="loading-state">Loading settings...</p>
        ) : (
          <ProviderSettingsForm
            config={config}
            isApiKeyVisible={isApiKeyVisible}
            isSaving={isSaving}
            isTesting={isTesting}
            saveStatus={saveStatus}
            statusMessage={statusMessage}
            onChange={(nextConfig) => {
              setConfig(nextConfig)
              setSaveStatus('idle')
              setStatusMessage(undefined)
            }}
            onSubmit={handleSave}
            onTestConnection={handleTestConnection}
            onClearApiKey={() => setConfig({ ...config, apiKey: '' })}
            onToggleApiKeyVisible={() => setIsApiKeyVisible((visible) => !visible)}
          />
        )}
      </section>
      {!isLoading ? (
        <JobAnalyzerTestPanel
          jdText={jdText}
          result={jobAnalyzerResult}
          errorMessage={jobAnalyzerError}
          isAnalyzing={isAnalyzing}
          onJdTextChange={(nextJdText) => {
            setJdText(nextJdText)
            setJobAnalyzerError(undefined)
          }}
          onAnalyze={handleAnalyzeJob}
        />
      ) : null}
      <ResumePdfTextPanel
        parsedResume={parsedResume}
        resumeProfile={resumeProfile}
        errorMessage={resumePdfError}
        isExtracting={isExtractingResumePdf}
        isAnalyzing={isAnalyzingResume}
        onFileSelect={handleResumePdfSelect}
        onAnalyze={handleAnalyzeResume}
        onClear={() => {
          setParsedResume(undefined)
          setResumeProfile(undefined)
          setResumePdfError(undefined)
        }}
      />
      <MatchingAgentTestPanel
        resumeProfile={resumeProfile}
        jobAnalysis={jobAnalyzerResult}
        matchResult={matchResult}
        errorMessage={matchError}
        isMatching={isMatching}
        onAnalyzeMatch={handleAnalyzeMatch}
      />
    </main>
  )
}

export default Options
