import type { FormEvent } from 'react'
import type { AIProviderConfig, AIProviderName } from '../../services/ai'
import { getProviderDefinition, PROVIDER_DEFINITIONS } from '../../services/ai'
import ApiKeyField from './ApiKeyField'
import BaseUrlField from './BaseUrlField'
import ModelField from './ModelField'
import ProviderSelect from './ProviderSelect'
import SaveStatus, { type SaveStatusValue } from './SaveStatus'

interface ProviderSettingsFormProps {
  config: AIProviderConfig
  isApiKeyVisible: boolean
  isSaving: boolean
  isTesting: boolean
  saveStatus: SaveStatusValue
  statusMessage?: string
  onChange: (config: AIProviderConfig) => void
  onSubmit: () => void
  onTestConnection: () => void
  onClearApiKey: () => void
  onToggleApiKeyVisible: () => void
}

function ProviderSettingsForm({
  config,
  isApiKeyVisible,
  isSaving,
  isTesting,
  saveStatus,
  statusMessage,
  onChange,
  onSubmit,
  onTestConnection,
  onClearApiKey,
  onToggleApiKeyVisible,
}: ProviderSettingsFormProps) {
  const providerDefinition = getProviderDefinition(config.provider)

  function handleProviderChange(provider: AIProviderName) {
    const nextProvider = getProviderDefinition(provider)

    onChange({
      ...config,
      provider,
      apiKey: '',
      model: config.model || nextProvider.defaultModel,
      baseUrl: config.baseUrl || nextProvider.defaultBaseUrl,
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <ProviderSelect
        providers={PROVIDER_DEFINITIONS}
        value={config.provider}
        onChange={handleProviderChange}
      />
      <ApiKeyField
        value={config.apiKey}
        visible={isApiKeyVisible}
        onChange={(apiKey) => onChange({ ...config, apiKey })}
        onClear={onClearApiKey}
        onToggleVisible={onToggleApiKeyVisible}
      />
      <ModelField
        value={config.model}
        placeholder={providerDefinition.defaultModel}
        onChange={(model) => onChange({ ...config, model })}
      />
      <details className="advanced-settings">
        <summary>Advanced settings</summary>
        <BaseUrlField
          value={config.baseUrl}
          placeholder={providerDefinition.defaultBaseUrl}
          onChange={(baseUrl) => onChange({ ...config, baseUrl })}
        />
      </details>
      <p className="security-note">
        API keys are saved locally in Chrome Storage and are not uploaded to this
        project&apos;s server.
      </p>
      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={isTesting}
          onClick={onTestConnection}
        >
          {isTesting ? 'Testing...' : 'Test connection'}
        </button>
        <SaveStatus status={saveStatus} message={statusMessage} />
      </div>
    </form>
  )
}

export default ProviderSettingsForm
