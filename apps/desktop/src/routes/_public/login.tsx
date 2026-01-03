import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { useToast } from '../../components/Toast'
import { TerminalInput } from '../../components/TerminalInput'
import { NebulaLogo } from '../../components/NebulaLogo'
import { TerminalButton } from '../../components/TerminalButton'
import { OtpVerificationScreen } from '../../components/OtpVerificationScreen'

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})

type AuthMode =
  | 'sign-in'
  | 'sign-up'
  | 'verify-email'
  | 'forgot-password-email'
  | 'forgot-password-otp'
  | 'forgot-password-reset'

function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: session } = authClient.useSession()

  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Navigate to dashboard when session becomes available
  useEffect(() => {
    if (session?.user) {
      navigate({ to: '/' })
    }
  }, [session, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'sign-up' && password !== confirmPassword) {
      toast.error('passwords do not match')
      return
    }

    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (result.error) {
          toast.error(result.error.message || 'sign up failed')
        } else {
          setMode('verify-email')
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })
        if (result.error) {
          if (result.error.status === 403) {
            toast.error('please verify your email before signing in')
            setMode('verify-email')
          } else if (result.error.status === 401 || result.error.status === 400) {
            toast.error('incorrect email or password')
          } else {
            toast.error(result.error.message || 'sign in failed')
          }
        }
      }
    } catch {
      toast.error('an unexpected error occurred')
    }
  }

  const handleResendVerification = async () => {
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
      if (result.error) {
        toast.error(result.error.message || 'failed to send verification code')
      } else {
        toast.success('verification code sent')
      }
    } catch {
      toast.error('failed to send verification code')
    }
  }

  const handleVerifyEmail = async (otp: string) => {
    if (otp.length !== 6) {
      toast.error('please enter a 6-digit code')
      return
    }

    setIsVerifying(true)

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })
      if (result.error) {
        toast.error(result.error.message || 'invalid verification code')
      }
    } catch {
      toast.error('verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  // Verify email mode
  if (mode === 'verify-email') {
    return (
      <OtpVerificationScreen
        email={email}
        description="verification code sent to"
        onVerify={handleVerifyEmail}
        onResend={handleResendVerification}
        onBack={() => setMode('sign-in')}
        isVerifying={isVerifying}
      />
    )
  }

  // Sign-in / Sign-up form
  return (
    <div className="text-sm w-[380px]">
      <form onSubmit={handleSubmit} noValidate className="p-6">
        <div className="flex justify-center mb-6">
          <NebulaLogo />
        </div>

        <div className="text-white mb-4">
          <span className="text-primary">$ </span>
          {mode === 'sign-up' ? 'create_account' : 'sign_in'}
        </div>

        {mode === 'sign-up' && <TerminalInput label="name" value={name} onChange={setName} />}

        <TerminalInput label="email" value={email} onChange={setEmail} autoFocus />

        <TerminalInput label="password" type="password" value={password} onChange={setPassword} />

        {mode === 'sign-up' && (
          <TerminalInput
            label="confirm"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        )}

        <div className="mt-4 space-y-2">
          <TerminalButton type="submit" variant="primary">
            {mode === 'sign-up' ? '[ create account ]' : '[ sign in ]'}
          </TerminalButton>

          <TerminalButton
            onClick={() => {
              setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')
              setConfirmPassword('')
            }}
            variant="link"
          >
            {mode === 'sign-up' ? '< already have account' : '> create new account'}
          </TerminalButton>
        </div>
      </form>
    </div>
  )
}
