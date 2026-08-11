interface ModelFieldProps {
  value: string
  placeholder: string
  onChange: (model: string) => void
}

function ModelField({ value, placeholder, onChange }: ModelFieldProps) {
  return (
    <label className="field">
      <span>Model</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default ModelField
