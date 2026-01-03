import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})

const NEBULA_LOGO = `███╗   ██╗███████╗██████╗ ██╗   ██╗██╗      █████╗
████╗  ██║██╔════╝██╔══██╗██║   ██║██║     ██╔══██╗
██╔██╗ ██║█████╗  ██████╔╝██║   ██║██║     ███████║
██║╚██╗██║██╔══╝  ██╔══██╗██║   ██║██║     ██╔══██║
██║ ╚████║███████╗██████╔╝╚██████╔╝███████╗██║  ██║
╚═╝  ╚═══╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝`

function TerminalInput({
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
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-white font-bold shrink-0">{label}:</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder:text-gray-700"
      />
    </div>
  )
}

function TerminalButton({
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
    'w-full py-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'text-white hover:text-gray-300 border border-gray-600 hover:border-gray-500',
    secondary: 'text-gray-500 hover:text-gray-400 border border-gray-700 hover:border-gray-600',
    link: 'text-gray-600 hover:text-gray-400 border-none',
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

function LoginPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [isVerifying, setIsVerifying] = useState(false)

  // Navigate to dashboard when session becomes available
  useEffect(() => {
    if (session?.user) {
      navigate({ to: '/' })
    }
  }, [session, navigate])

  // Countdown timer for resend button
  useEffect(() => {
    if (!pendingVerification || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [pendingVerification, countdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (result.error) {
          setError(result.error.message || 'Sign up failed')
        } else {
          setPendingVerification(true)
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })
        if (result.error) {
          if (result.error.status === 403) {
            setError('Please verify your email before signing in')
            setPendingVerification(true)
          } else if (result.error.status === 401 || result.error.status === 400) {
            setError('incorrect email or password')
          } else {
            setError(result.error.message || 'Sign in failed')
          }
        }
        // On success, the useEffect watching session will navigate us
      }
    } catch {
      setError('An unexpected error occurred')
    }
  }

  const handleResendVerification = async () => {
    if (countdown > 0) return

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
      if (result.error) {
        setError(result.error.message || 'Failed to send verification code')
      } else {
        setError('')
        setCountdown(30)
      }
    } catch {
      setError('Failed to send verification code')
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })
      if (result.error) {
        setError(result.error.message || 'Invalid verification code')
      }
      // On success, the useEffect watching session will navigate us
    } catch {
      setError('Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  if (pendingVerification) {
    return (
      <div className="text-sm w-[380px]">
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <pre className="text-white text-[10px] leading-none select-none">{NEBULA_LOGO}</pre>
          </div>

          <div className="text-white mb-4">
            <span className="text-gray-400">// </span>
            verification code sent to {email}
          </div>

          {error && (
            <div className="mb-4 text-red-400">
              <span className="text-red-600">error: </span>
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="text-white font-bold">code:</span>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(value)
              }}
              placeholder="______"
              maxLength={6}
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-gray-200 tracking-widest placeholder:text-gray-700"
            />
          </div>

          <div className="space-y-2">
            <TerminalButton
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || isVerifying}
              variant="primary"
            >
              {isVerifying ? '[ verifying... ]' : '[ verify ]'}
            </TerminalButton>

            <TerminalButton
              onClick={handleResendVerification}
              disabled={countdown > 0}
              variant="secondary"
            >
              {countdown > 0 ? `[ resend in ${countdown}s ]` : '[ resend code ]'}
            </TerminalButton>

            <TerminalButton
              onClick={() => {
                setPendingVerification(false)
                setOtp('')
                setCountdown(30)
                setError('')
              }}
              variant="link"
            >
              {'<'} back
            </TerminalButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm w-[380px]">
      <form onSubmit={handleSubmit} noValidate className="p-6">
        <div className="flex justify-center mb-6">
          <pre className="text-white text-[10px] leading-none select-none">{NEBULA_LOGO}</pre>
        </div>

        <div className="text-white mb-4">
          <span className="text-gray-400">$ </span>
          {isSignUp ? 'create_account' : 'sign_in'}
        </div>

        {error && (
          <div className="mb-4 text-red-400">
            <span className="text-red-600">error: </span>
            {error}
          </div>
        )}

        {isSignUp && <TerminalInput label="name" value={name} onChange={setName} />}

        {/* TODO(NEBULA-52o): Restore type="email" for validation */}
        <TerminalInput label="email" value={email} onChange={setEmail} autoFocus />

        {/* TODO(NEBULA-52o): Restore minLength={8} for validation */}
        <TerminalInput label="password" type="password" value={password} onChange={setPassword} />

        <div className="mt-4 space-y-2">
          <TerminalButton type="submit" variant="primary">
            {isSignUp ? '[ create account ]' : '[ sign in ]'}
          </TerminalButton>

          <TerminalButton onClick={() => setIsSignUp(!isSignUp)} variant="link">
            {isSignUp ? '< already have account' : '> create new account'}
          </TerminalButton>
        </div>
      </form>
    </div>
  )
}
