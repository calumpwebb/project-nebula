# Auth Routes with Inline Error Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split monolithic login component into separate routes while replacing toast notifications with inline form error handling using TanStack Form.

**Architecture:** Extract 6 auth modes from single 455-line file into dedicated routes (login, signup, verify-email, forgot-password, reset-password). Use TanStack Router state for email passing, TanStack Form for validation, and inline errors below inputs/buttons instead of toasts.

**Tech Stack:** TanStack Router, TanStack Form, React, TypeScript

---

## Task 1: Install TanStack Form

**Files:**

- Modify: `apps/desktop/package.json`

**Step 1: Install dependency**

Run: `pnpm add @tanstack/react-form --filter=@nebula/desktop`

Expected: Package installed, package.json updated

**Step 2: Verify installation**

Run: `pnpm list @tanstack/react-form --filter=@nebula/desktop`

Expected: Shows installed version

**Step 3: Commit**

```bash
git add apps/desktop/package.json pnpm-lock.yaml
git commit -m "chore(NEBULA-xxx): install TanStack Form"
```

---

## Task 2: Update Input Component

**Files:**

- Modify: `apps/desktop/src/components/Input.tsx`

**Step 1: Add new props to Input component**

Replace entire file content:

```typescript
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
        {hint && (
          isHintClickable ? (
            <button
              type="button"
              onClick={onHintClick}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              {hint}
            </button>
          ) : (
            <span className="text-sm text-foreground-secondary">
              {hint}
            </span>
          )
        )}
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
          ${hasError
            ? 'border-destructive focus:border-destructive focus:ring-destructive'
            : 'border-input focus:border-input-focus focus:ring-ring'
          }
          placeholder:text-foreground-tertiary
        `}
      />
      {error && (
        <p className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes (Input component compiles)

**Step 3: Commit**

```bash
git add apps/desktop/src/components/Input.tsx
git commit -m "feat(NEBULA-xxx): add error and hint props to Input component"
```

---

## Task 3: Update OtpVerificationScreen Component

**Files:**

- Modify: `apps/desktop/src/components/OtpVerificationScreen.tsx`

**Step 1: Add error state and update component**

Replace entire file content:

```typescript
import { useState, useEffect } from 'react'
import { Button } from './Button'

type OtpVerificationScreenProps = {
  email: string
  description: string
  onVerify: (otp: string) => Promise<{ error?: { message?: string } } | void>
  onResend: () => Promise<void>
  onBack: () => void
  verifyButtonText?: string
  verifyingButtonText?: string
}

export function OtpVerificationScreen({
  email,
  description,
  onVerify,
  onResend,
  onBack,
  verifyButtonText = 'Verify',
  verifyingButtonText = 'Verifying...',
}: OtpVerificationScreenProps) {
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string>('')
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleVerify = async () => {
    setError('')

    if (otp.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      const result = await onVerify(otp)
      if (result?.error) {
        setError(result.error.message || 'Invalid verification code')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setError('')
    await onResend()
    setCountdown(30)
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Enter verification code</h2>
          <p className="text-sm text-foreground-secondary">
            {description} <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2">
            Verification code
          </label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setOtp(value)
              setError('')
            }}
            placeholder="000000"
            maxLength={6}
            autoFocus
            className={`
              w-full px-4 py-3 text-center text-2xl tracking-wider
              bg-background border rounded-md font-mono
              transition-colors focus:outline-none focus:ring-1
              ${error
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : 'border-input focus:border-input-focus focus:ring-ring'
              }
            `}
          />
          {error && (
            <p className="mt-2 text-sm text-destructive text-center">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isVerifying}
            variant="primary"
            className="w-full"
          >
            {isVerifying ? verifyingButtonText : verifyButtonText}
          </Button>

          <Button
            onClick={handleResend}
            disabled={countdown > 0}
            variant="secondary"
            className="w-full"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </Button>

          <div className="text-center pt-2">
            <button
              onClick={onBack}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 3: Commit**

```bash
git add apps/desktop/src/components/OtpVerificationScreen.tsx
git commit -m "feat(NEBULA-xxx): add inline error handling to OtpVerificationScreen"
```

---

## Task 4: Create Login Route

**Files:**

- Create: `apps/desktop/src/routes/_public/login.new.tsx`

**Step 1: Create new login route file**

Create file with this content:

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [formError, setFormError] = useState<string>('')

  useEffect(() => {
    if (session?.user) {
      navigate({ to: '/' })
    }
  }, [session, navigate])

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      const result = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })

      if (result.error) {
        if (result.error.status === 403) {
          navigate({ to: '/verify-email', state: { email: value.email } })
        } else if (result.error.status === 401 || result.error.status === 400) {
          setFormError('Incorrect email or password')
        } else {
          setFormError(result.error.message || 'Sign in failed')
        }
      }
    },
  })

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        autoComplete="on"
        className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
        </div>

        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoFocus
              autoComplete="username"
              name="email"
              id="email"
              placeholder="you@example.com"
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Input
              label="Password"
              type="password"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoComplete="current-password"
              name="password"
              id="password"
              placeholder="••••••••"
              hint="Forgot password?"
              onHintClick={() => navigate({ to: '/forgot-password' })}
            />
          )}
        </form.Field>

        {formError && (
          <p className="mt-4 text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            Sign in
          </Button>

          <div className="text-center pt-2">
            <span className="text-sm text-foreground-secondary">
              Don't have an account?{' '}
            </span>
            <button
              onClick={() => navigate({ to: '/signup' })}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors font-medium"
              type="button"
            >
              Sign up
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 3: Commit**

```bash
git add apps/desktop/src/routes/_public/login.new.tsx
git commit -m "feat(NEBULA-xxx): create new login route with TanStack Form"
```

---

## Task 5: Create Signup Route

**Files:**

- Create: `apps/desktop/src/routes/_public/signup.tsx`

**Step 1: Create signup route file**

Create file with this content:

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

export const Route = createFileRoute('/_public/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [formError, setFormError] = useState<string>('')

  useEffect(() => {
    if (session?.user) {
      navigate({ to: '/' })
    }
  }, [session, navigate])

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: ({ value }) => {
        if (value.password !== value.confirmPassword) {
          return {
            fields: {
              confirmPassword: 'Passwords do not match',
            },
          }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      const result = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      })

      if (result.error) {
        setFormError(result.error.message || 'Sign up failed')
      } else {
        navigate({ to: '/verify-email', state: { email: value.email } })
      }
    },
  })

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        autoComplete="on"
        className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Create account</h2>
        </div>

        <form.Field name="name">
          {(field) => (
            <Input
              label="Name"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoComplete="name"
              name="name"
              id="name"
              placeholder="Your name"
            />
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoFocus
              autoComplete="username"
              name="email"
              id="email"
              placeholder="you@example.com"
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Input
              label="Password"
              type="password"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoComplete="new-password"
              name="password"
              id="password"
              placeholder="••••••••"
            />
          )}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => (
            <Input
              label="Confirm password"
              type="password"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoComplete="new-password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="••••••••"
            />
          )}
        </form.Field>

        {formError && (
          <p className="mt-4 text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            Create account
          </Button>

          <div className="text-center pt-2">
            <span className="text-sm text-foreground-secondary">
              Already have an account?{' '}
            </span>
            <button
              onClick={() => navigate({ to: '/login' })}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors font-medium"
              type="button"
            >
              Sign in
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 3: Commit**

```bash
git add apps/desktop/src/routes/_public/signup.tsx
git commit -m "feat(NEBULA-xxx): create signup route with TanStack Form"
```

---

## Task 6: Create Verify Email Route

**Files:**

- Create: `apps/desktop/src/routes/_public/verify-email.tsx`

**Step 1: Create verify email route file**

Create file with this content:

```typescript
import { createFileRoute, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { OtpVerificationScreen } from '../../components/OtpVerificationScreen'

export const Route = createFileRoute('/_public/verify-email')({
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  useEffect(() => {
    if (!email) {
      navigate({ to: '/signup' })
    }
  }, [email, navigate])

  if (!email) {
    return null
  }

  const handleVerify = async (otp: string) => {
    const result = await authClient.emailOtp.verifyEmail({
      email,
      otp,
    })

    return result
  }

  const handleResend = async () => {
    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
    })
  }

  return (
    <OtpVerificationScreen
      email={email}
      description="Verification code sent to"
      onVerify={handleVerify}
      onResend={handleResend}
      onBack={() => navigate({ to: '/login' })}
    />
  )
}
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 3: Commit**

```bash
git add apps/desktop/src/routes/_public/verify-email.tsx
git commit -m "feat(NEBULA-xxx): create verify email route"
```

---

## Task 7: Create Forgot Password Route

**Files:**

- Create: `apps/desktop/src/routes/_public/forgot-password.tsx`

**Step 1: Create forgot password route file**

Create file with this content:

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

export const Route = createFileRoute('/_public/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string>('')

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      try {
        await authClient.emailOtp.sendVerificationOtp({
          email: value.email,
          type: 'forget-password',
        })
        navigate({ to: '/reset-password', state: { email: value.email } })
      } catch {
        // Don't show error for security - proceed anyway
        navigate({ to: '/reset-password', state: { email: value.email } })
      }
    },
  })

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        autoComplete="on"
        className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Reset password</h2>
        </div>

        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              error={field.state.meta.errors[0]}
              autoFocus
              autoComplete="username"
              name="email"
              id="email"
              placeholder="you@example.com"
            />
          )}
        </form.Field>

        {formError && (
          <p className="mt-4 text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            Send reset code
          </Button>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate({ to: '/login' })}
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
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 3: Commit**

```bash
git add apps/desktop/src/routes/_public/forgot-password.tsx
git commit -m "feat(NEBULA-xxx): create forgot password route"
```

---

## Task 8: Create Reset Password Route

**Files:**

- Create: `apps/desktop/src/routes/_public/reset-password.tsx`

**Step 1: Create reset password route file**

Create file with this content:

```typescript
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
  const email = location.state?.email || ''
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
    return { error: undefined }
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
    <div className="w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        className="bg-white rounded-lg shadow-[var(--card-shadow)] p-8"
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
              error={field.state.meta.errors[0]}
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
              error={field.state.meta.errors[0]}
              placeholder="••••••••"
            />
          )}
        </form.Field>

        {formError && (
          <p className="mt-4 text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <Button type="submit" variant="primary" disabled={isResetting} className="w-full">
            {isResetting ? 'Resetting...' : 'Reset password'}
          </Button>

          <div className="text-center pt-2">
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
```

**Step 2: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 3: Commit**

```bash
git add apps/desktop/src/routes/_public/reset-password.tsx
git commit -m "feat(NEBULA-xxx): create reset password route"
```

---

## Task 9: Replace Old Login Route

**Files:**

- Delete: `apps/desktop/src/routes/_public/login.tsx`
- Rename: `apps/desktop/src/routes/_public/login.new.tsx` → `apps/desktop/src/routes/_public/login.tsx`

**Step 1: Delete old login file**

Run: `git rm apps/desktop/src/routes/_public/login.tsx`

Expected: File deleted

**Step 2: Rename new login file**

Run: `git mv apps/desktop/src/routes/_public/login.new.tsx apps/desktop/src/routes/_public/login.tsx`

Expected: File renamed

**Step 3: Run type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: Type check passes

**Step 4: Commit**

```bash
git add apps/desktop/src/routes/_public/login.tsx
git commit -m "feat(NEBULA-xxx): replace old login route with new split routes"
```

---

## Task 10: End-to-End Testing

**Files:**

- None (manual testing)

**Step 1: Start development environment**

Run: `just up`

Expected: Desktop app starts successfully

**Step 2: Test sign up flow**

Manual steps:

1. Navigate to signup page
2. Enter name, email, password, confirm password
3. Submit form
4. Verify navigation to verify-email page
5. Verify email passed via router state
6. Enter OTP code
7. Verify successful verification

Expected: All steps work, errors show inline (not toasts)

**Step 3: Test login flow**

Manual steps:

1. Navigate to login page
2. Enter incorrect credentials
3. Verify error shows below submit button (not toast)
4. Enter correct credentials
5. Verify successful login

Expected: Error handling works correctly

**Step 4: Test forgot password flow**

Manual steps:

1. Navigate to login page
2. Click "Forgot password?" hint
3. Enter email
4. Verify navigation to reset-password page
5. Enter OTP
6. Enter new password
7. Verify auto-login after reset

Expected: Full flow works end-to-end

**Step 5: Test unverified email handling**

Manual steps:

1. Try to login with unverified email
2. Verify silent navigation to verify-email page
3. Verify email passed correctly

Expected: Navigation works without toast

**Step 6: Test field validation**

Manual steps:

1. On signup, enter non-matching passwords
2. Verify error shows below confirm password field (not toast)
3. On verify-email, enter partial OTP
4. Verify error shows below OTP input (not toast)

Expected: All field errors display inline

**Step 7: Document test results**

Create note in plan:

- ✅ Sign up flow works
- ✅ Login flow works
- ✅ Forgot password flow works
- ✅ Unverified email handling works
- ✅ Field validation works
- ✅ All errors display inline (no toasts)

---

## Task 11: Final Cleanup

**Files:**

- Check: `apps/desktop/src/**/*.tsx` for remaining `useToast` imports

**Step 1: Search for remaining toast usage**

Run: `grep -r "useToast" apps/desktop/src/routes/_public/`

Expected: No matches found in auth routes

**Step 2: Run final type check**

Run: `pnpm turbo check --filter=@nebula/desktop`

Expected: All type checks pass

**Step 3: Run full build**

Run: `pnpm turbo build --filter=@nebula/desktop`

Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(NEBULA-xxx): finalize auth routes refactor with inline errors"
```

---

## Success Criteria

- ✅ Auth flows split into 5 separate routes
- ✅ Each route < 150 lines
- ✅ TanStack Form handles validation
- ✅ Field errors show below inputs with red borders
- ✅ Form errors show below submit buttons
- ✅ No toast notifications in auth flows
- ✅ Email passed via router state (never password)
- ✅ Browser back button works naturally
- ✅ All type checks pass
- ✅ All manual tests pass

## Rollback Plan

If issues arise:

1. Revert to commit before Task 1
2. Review failed test cases
3. Fix issues in separate branch
4. Re-attempt implementation

## Notes

- Test after each route creation to catch issues early
- OTP verification component is shared between verify-email and reset-password
- Silent success on all successful operations (no toasts)
- Security: forgot password flow doesn't reveal if email exists
