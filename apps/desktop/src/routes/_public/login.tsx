import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { useToast } from '../../components/Toast'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
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
  const [isResettingPassword, setIsResettingPassword] = useState(false)
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
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })
      if (result.error) {
        return { error: { message: result.error.message || 'invalid verification code' } }
      }
      // Success - return void
      return
    } catch {
      return { error: { message: 'verification failed' } }
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      })
      setMode('forgot-password-otp')
    } catch {
      // Don't show error for security - proceed to OTP screen
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

    setIsResettingPassword(true)

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
      setIsResettingPassword(false)
    }
  }

  const resetForgotPasswordState = () => {
    setNewPassword('')
    setConfirmNewPassword('')
    setVerifiedOtp('')
  }

  // Verify email mode
  if (mode === 'verify-email') {
    return (
      <OtpVerificationScreen
        email={email}
        description="Verification code sent to"
        onVerify={handleVerifyEmail}
        onResend={handleResendVerification}
        onBack={() => setMode('sign-in')}
      />
    )
  }

  // Forgot password - email entry
  if (mode === 'forgot-password-email') {
    return (
      <div className="w-full max-w-md">
        <form
          onSubmit={handleForgotPasswordSubmit}
          noValidate
          autoComplete="on"
          className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Reset password</h2>
          </div>

          <Input
            label="Email"
            value={email}
            onChange={setEmail}
            autoFocus
            autoComplete="username"
            name="email"
            id="email"
            placeholder="you@example.com"
          />

          <div className="mt-6 space-y-3">
            <Button type="submit" variant="primary" className="w-full">
              Send reset code
            </Button>

            <div className="text-center pt-2">
              <button
                onClick={() => setMode('sign-in')}
                className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                type="button"
              >
                ← Back to sign in
              </button>
            </div>
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
        description="Reset code sent to"
        onVerify={handleVerifyResetCode}
        onResend={handleResendResetCode}
        onBack={() => {
          setMode('forgot-password-email')
          setVerifiedOtp('')
        }}
        verifyButtonText="Verify code"
      />
    )
  }

  // Forgot password - new password entry
  if (mode === 'forgot-password-reset') {
    return (
      <div className="w-full max-w-md">
        <form
          onSubmit={handleResetPassword}
          noValidate
          className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Set new password</h2>
          </div>

          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoFocus
            placeholder="••••••••"
          />

          <Input
            label="Confirm password"
            type="password"
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            placeholder="••••••••"
          />

          <div className="mt-6 space-y-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isResettingPassword}
              className="w-full"
            >
              {isResettingPassword ? 'Resetting...' : 'Reset password'}
            </Button>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setMode('forgot-password-otp')
                  setNewPassword('')
                  setConfirmNewPassword('')
                }}
                className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                type="button"
              >
                ← Back
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // Sign-in / Sign-up form
  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        noValidate
        autoComplete="on"
        className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {mode === 'sign-up' ? 'Create account' : 'Sign in'}
          </h2>
        </div>

        {mode === 'sign-up' && (
          <Input
            label="Name"
            value={name}
            onChange={setName}
            autoComplete="name"
            name="name"
            id="name"
            placeholder="Your name"
          />
        )}

        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          autoFocus
          autoComplete="username"
          name="email"
          id="email"
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          name="password"
          id="password"
          placeholder="••••••••"
        />

        {mode === 'sign-up' && (
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            name="confirmPassword"
            id="confirmPassword"
            placeholder="••••••••"
          />
        )}

        {mode === 'sign-in' && (
          <div className="text-right mb-2">
            <button
              type="button"
              onClick={() => setMode('forgot-password-email')}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            {mode === 'sign-up' ? 'Create account' : 'Sign in'}
          </Button>

          <div className="text-center pt-2">
            <span className="text-sm text-foreground-secondary">
              {mode === 'sign-up' ? 'Already have an account?' : "Don't have an account?"}{' '}
            </span>
            <button
              onClick={() => {
                setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')
                setConfirmPassword('')
              }}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors font-medium"
              type="button"
            >
              {mode === 'sign-up' ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
