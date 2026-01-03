export function TerminalButton({
  children,
  onClick,
  type = 'button',
  disabled,
  variant = 'primary',
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'link'
}) {
  const baseStyles =
    'w-full py-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none'
  const variants = {
    primary:
      'text-primary border border-primary hover:bg-primary hover:text-background focus:bg-primary focus:text-background',
    secondary:
      'text-gray-500 border border-gray-700 hover:bg-gray-700 hover:text-foreground focus:bg-gray-700 focus:text-foreground',
    link: 'text-primary/60 hover:text-primary border-none',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {children}
    </button>
  )
}
