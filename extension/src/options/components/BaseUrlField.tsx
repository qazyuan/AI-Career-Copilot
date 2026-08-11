interface BaseUrlFieldProps {
  value: string
  placeholder: string
  onChange: (baseUrl: string) => void
}

function BaseUrlField({ value, placeholder, onChange }: BaseUrlFieldProps) {
  return (
    <label className="field">
      <span>Base URL</span>
      <input
        type="url"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default BaseUrlField
