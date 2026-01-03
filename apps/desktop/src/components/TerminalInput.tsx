import { useState } from 'react'

export function TerminalInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const [capsLock, setCapsLock] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const showCapsLockIndicator = type === 'password' && capsLock && isFocused

  const handleKeyEvent = (e: React.KeyboardEvent) => {
    setCapsLock(e.getModifierState('CapsLock'))
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-white font-bold shrink-0">{label}:</span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyEvent}
          onKeyUp={handleKeyEvent}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-200 placeholder:text-gray-700"
        />
        {showCapsLockIndicator && (
          <span className="text-yellow-500 text-xs shrink-0" title="Caps Lock is on">
            [CAPS]
          </span>
        )}
      </div>
    </div>
  )
}
