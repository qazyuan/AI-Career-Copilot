interface ApiKeyFieldProps {
  value: string
  visible: boolean
  onChange: (apiKey: string) => void
  onClear: () => void
  onToggleVisible: () => void
}

function ApiKeyField({
  value,
  visible,
  onChange,
  onClear,
  onToggleVisible,
}: ApiKeyFieldProps) {
  return (
    <label className="field">
      <span>API Key</span>
      <div className="input-row">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder="Enter your API key"
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className="secondary-button" onClick={onToggleVisible}>
          {visible ? 'Hide' : 'Show'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onClear}
          disabled={!value}
        >
          Clear
        </button>
      </div>
    </label>
  )
}

export default ApiKeyField
