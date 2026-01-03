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
  const [_resetCodeSent, setResetCodeSent] = useState(false)
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      })
      // Always show success (security - don't reveal if account exists)
      toast.success('if this email exists, we sent a reset code')
      setResetCodeSent(true)
      setMode('forgot-password-otp')
    } catch {
      // Still show success message for security
      toast.success('if this email exists, we sent a reset code')
      setResetCodeSent(true)
      setMode('forgot-password-otp')
    }
  }

  const handleResendResetCode = async () => {
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      })
      if (result.error) {
        toast.error(result.error.message || 'failed to send reset code')
      } else {
        toast.success('reset code sent')
      }
    } catch {
      toast.error('failed to send reset code')
    }
  }

  const handleVerifyResetCode = async (otp: string) => {
    if (otp.length !== 6) {
      toast.error('please enter a 6-digit code')
      return
    }

    // Store OTP and move to password reset screen
    // The actual verification happens when we reset the password
    setVerifiedOtp(otp)
    setMode('forgot-password-reset')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmNewPassword) {
      toast.error('passwords do not match')
      return
    }

    if (newPassword.length < 1) {
      toast.error('password is required')
      return
    }

    setIsVerifying(true)

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp: verifiedOtp,
        password: newPassword,
      })

      if (result.error) {
        toast.error(result.error.message || 'failed to reset password')
        // If OTP was invalid, go back to OTP screen
        if (
          result.error.message?.includes('invalid') ||
          result.error.message?.includes('expired')
        ) {
          setMode('forgot-password-otp')
          setVerifiedOtp('')
        }
      } else {
        // Auto sign-in
        const signInResult = await authClient.signIn.email({
          email,
          password: newPassword,
        })

        if (signInResult.error) {
          toast.success('password reset successfully')
          setMode('sign-in')
          resetForgotPasswordState()
        } else {
          toast.success('password reset successfully')
          // Session watcher will navigate to dashboard
        }
      }
    } catch {
      toast.error('failed to reset password')
    } finally {
      setIsVerifying(false)
    }
  }

  const resetForgotPasswordState = () => {
    setNewPassword('')
    setConfirmNewPassword('')
    setVerifiedOtp('')
    setResetCodeSent(false)
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

  // Forgot password - email entry
  if (mode === 'forgot-password-email') {
    return (
      <div className="text-sm w-[380px]">
        <form onSubmit={handleForgotPasswordSubmit} noValidate autoComplete="on" className="p-6">
          <div className="flex justify-center mb-6">
            <NebulaLogo />
          </div>

          <div className="text-white mb-4">
            <span className="text-gray-400">// </span>
            enter your email to receive a reset code
          </div>

          <TerminalInput
            label="email"
            value={email}
            onChange={setEmail}
            autoFocus
            autoComplete="username"
            name="email"
            id="email"
          />

          <div className="mt-4 space-y-2">
            <TerminalButton type="submit" variant="primary">
              [ send reset code ]
            </TerminalButton>

            <TerminalButton
              onClick={() => {
                setMode('sign-in')
                setResetCodeSent(false)
              }}
              variant="link"
            >
              {'<'} back to sign in
            </TerminalButton>
          </div>
        </form>
      </div>
    )
  }

  // Forgot password - OTP entry
  if (mode === 'forgot-password-otp') {
    return (
      <OtpVerificationScreen
        email={email}
        description="reset code sent to"
        onVerify={handleVerifyResetCode}
        onResend={handleResendResetCode}
        onBack={() => {
          setMode('forgot-password-email')
          setVerifiedOtp('')
        }}
        isVerifying={false}
        verifyButtonText="[ verify code ]"
      />
    )
  }

  // Forgot password - new password entry
  if (mode === 'forgot-password-reset') {
    return (
      <div className="text-sm w-[380px]">
        <form onSubmit={handleResetPassword} noValidate className="p-6">
          <div className="flex justify-center mb-6">
            <NebulaLogo />
          </div>

          <div className="text-white mb-4">
            <span className="text-gray-400">// </span>
            create your new password
          </div>

          <TerminalInput
            label="password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoFocus
          />

          <TerminalInput
            label="confirm"
            type="password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
          />

          <div className="mt-4 space-y-2">
            <TerminalButton type="submit" variant="primary" disabled={isVerifying}>
              {isVerifying ? '[ resetting... ]' : '[ reset password ]'}
            </TerminalButton>

            <TerminalButton
              onClick={() => {
                setMode('forgot-password-otp')
                setNewPassword('')
                setConfirmNewPassword('')
              }}
              variant="link"
            >
              {'<'} back
            </TerminalButton>
          </div>
        </form>
      </div>
    )
  }

  // Sign-in / Sign-up form
  return (
    <div className="text-sm w-[380px]">
      <form onSubmit={handleSubmit} noValidate autoComplete="on" className="p-6">
        <div className="flex justify-center mb-6">
          <NebulaLogo />
        </div>

        <div className="text-white mb-4">
          <span className="text-primary">$ </span>
          {mode === 'sign-up' ? 'create_account' : 'sign_in'}
        </div>

        {mode === 'sign-up' && (
          <TerminalInput
            label="name"
            value={name}
            onChange={setName}
            autoComplete="name"
            name="name"
            id="name"
          />
        )}

        <TerminalInput
          label="email"
          value={email}
          onChange={setEmail}
          autoFocus
          autoComplete="username"
          name="email"
          id="email"
        />

        <TerminalInput
          label="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          name="password"
          id="password"
        />

        {mode === 'sign-up' && (
          <TerminalInput
            label="confirm"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            name="confirmPassword"
            id="confirmPassword"
          />
        )}

        {mode === 'sign-in' && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setMode('forgot-password-email')}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              forgot password?
            </button>
          </div>
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
