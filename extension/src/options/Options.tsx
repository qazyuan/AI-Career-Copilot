import { useEffect, useState } from 'react'
import type { AIProviderConfig } from '../services/ai'
import { getProviderDefinition } from '../services/ai'
import { getAIProviderConfig, saveAIProviderConfig } from '../services/storage'
import ProviderSettingsForm from './components/ProviderSettingsForm'
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
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatusValue>('idle')
  const [statusMessage, setStatusMessage] = useState<string>()

  useEffect(() => {
    let isMounted = true

    async function loadConfig() {
      try {
        const savedConfig = await getAIProviderConfig()

        if (isMounted && savedConfig) {
          setConfig(savedConfig)
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
            saveStatus={saveStatus}
            statusMessage={statusMessage}
            onChange={(nextConfig) => {
              setConfig(nextConfig)
              setSaveStatus('idle')
              setStatusMessage(undefined)
            }}
            onSubmit={handleSave}
            onClearApiKey={() => setConfig({ ...config, apiKey: '' })}
            onToggleApiKeyVisible={() => setIsApiKeyVisible((visible) => !visible)}
          />
        )}
      </section>
    </main>
  )
}

export default Options
