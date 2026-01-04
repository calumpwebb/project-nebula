import { createFileRoute, useNavigate, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { OtpVerificationScreen } from '../../components/OtpVerificationScreen'

export const Route = createFileRoute('/_public/reset-password')({
  component: ResetPasswordPage,
})

type ResetPasswordMode = 'otp' | 'password'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | undefined)?.email || ''
  const [mode, setMode] = useState<ResetPasswordMode>('otp')
  const [verifiedOtp, setVerifiedOtp] = useState<string>('')
  const [formError, setFormError] = useState<string>('')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    if (!email) {
      navigate({ to: '/forgot-password' })
    }
  }, [email, navigate])

  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
    validators: {
      onChange: ({ value }) => {
        if (value.newPassword !== value.confirmNewPassword) {
          return {
            fields: {
              confirmNewPassword: 'Passwords do not match',
            },
          }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      if (value.newPassword.length < 1) {
        setFormError('Password is required')
        return
      }

      setIsResetting(true)

      try {
        const result = await authClient.emailOtp.resetPassword({
          email,
          otp: verifiedOtp,
          password: value.newPassword,
        })

        if (result.error) {
          setFormError(result.error.message || 'Failed to reset password')
          if (
            result.error.message?.includes('invalid') ||
            result.error.message?.includes('expired')
          ) {
            setMode('otp')
            setVerifiedOtp('')
          }
        } else {
          // Auto sign-in
          const signInResult = await authClient.signIn.email({
            email,
            password: value.newPassword,
          })

          if (signInResult.error) {
            navigate({ to: '/login' })
          }
          // Session watcher will navigate to dashboard
        }
      } catch {
        setFormError('Failed to reset password')
      } finally {
        setIsResetting(false)
      }
    },
  })

  if (!email) {
    return null
  }

  const handleVerifyOtp = async (otp: string) => {
    setVerifiedOtp(otp)
    setMode('password')
  }

  const handleResendOtp = async () => {
    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'forget-password',
    })
  }

  if (mode === 'otp') {
    return (
      <OtpVerificationScreen
        email={email}
        description="Reset code sent to"
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onBack={() => {
          navigate({ to: '/forgot-password' })
          setVerifiedOtp('')
        }}
        verifyButtonText="Verify code"
      />
    )
  }

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        className="bg-white rounded-lg border border-border shadow-[var(--card-shadow)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Set new password</h2>
        </div>

        <form.Field name="newPassword">
          {(field) => (
            <Input
              label="New password"
              type="password"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              {...(field.state.meta.errors[0] ? { error: field.state.meta.errors[0] } : {})}
              autoFocus
              placeholder="••••••••"
            />
          )}
        </form.Field>

        <form.Field name="confirmNewPassword">
          {(field) => (
            <Input
              label="Confirm password"
              type="password"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              {...(field.state.meta.errors[0] ? { error: field.state.meta.errors[0] } : {})}
              placeholder="••••••••"
            />
          )}
        </form.Field>

        {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}

        <div className="mt-6 space-y-3">
          <Button type="submit" variant="primary" disabled={isResetting} className="w-full">
            {isResetting ? 'Resetting...' : 'Reset password'}
          </Button>

          <div className="text-center">
            <button
              onClick={() => {
                setMode('otp')
                form.reset()
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
