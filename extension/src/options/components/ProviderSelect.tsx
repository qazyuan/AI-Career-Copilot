import type { AIProviderName, ProviderDefinition } from '../../services/ai'

interface ProviderSelectProps {
  providers: ProviderDefinition[]
  value: AIProviderName
  onChange: (provider: AIProviderName) => void
}

function ProviderSelect({ providers, value, onChange }: ProviderSelectProps) {
  return (
    <label className="field">
      <span>Provider</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AIProviderName)}
      >
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default ProviderSelect
