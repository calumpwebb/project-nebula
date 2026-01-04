export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
  name,
  id,
  error,
  hint,
  onHintClick,
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
  name?: string
  id?: string
  error?: string
  hint?: string
  onHintClick?: () => void
}) {
  const hasError = !!error
  const isHintClickable = !!onHintClick

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {hint &&
          (isHintClickable ? (
            <button
              type="button"
              onClick={onHintClick}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              {hint}
            </button>
          ) : (
            <span className="text-sm text-foreground-secondary">{hint}</span>
          ))}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        name={name}
        id={id}
        className={`
          w-full px-3.5 py-2.5 text-sm bg-background
          border rounded-md transition-colors
          focus:outline-none focus:ring-1
          ${
            hasError
              ? 'border-destructive focus:border-destructive focus:ring-destructive'
              : 'border-input focus:border-input-focus focus:ring-ring'
          }
          placeholder:text-foreground-tertiary
        `}
      />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  )
}
