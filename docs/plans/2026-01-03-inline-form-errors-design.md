# Inline Form Error Handling Design

## Overview

Remove toasts from auth flows. Move error handling inline with forms using TanStack Form. Field errors show below inputs, general errors show below submit buttons.

## Goals

- Remove all toast usage from authentication flows
- Show field-specific errors directly below inputs with red borders
- Show general API errors below submit buttons
- Silent success (auto-navigate to next screen)
- Pass email between routes via router state (never password)

## Design Decisions

### Error Display Standard

- **Field errors**: Below the input that failed validation
- **Form errors**: Below the submit button for general API failures
- **Success feedback**: None - silently advance to next screen

### When Errors Clear

- Field errors: Automatically when user types (TanStack Form handles)
- Form errors: When form is submitted again
- OTP errors: When verify is clicked again or code is resent

### Router State

- Pass `email` between auth routes via `navigate({ state: { email } })`
- Never pass `password` - security best practice
- If email missing from state on target route, redirect back to source

## Component Changes

### Input Component

Supports errors and hints:

**New Props:**

- `error?: string` - Error message (displays below input)
- `hint?: string` - Text (right-aligned beside label)
- `onHintClick?: () => void` - Click handler for hint (e.g., "Forgot password?")

**Visual Changes:**

- Red border indicates errors
- Error text appears in red below input
- Hint appears gray; `onHintClick` makes it clickable

**Implementation:**

```typescript
export function Input({
  label,
  error,
  hint,
  onHintClick,
  // ... other props
}: {
  label: string
  error?: string
  hint?: string
  onHintClick?: () => void
  // ... other types
}) {
  const hasError = !!error
  const isHintClickable = !!onHintClick

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-foreground">
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
        // ... other props
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

### OtpVerificationScreen Component

Adds internal error state, removes toast dependencies:

**Changes:**

- Adds `error` state variable
- Shows error below OTP input with red border
- Clears error on verify attempt and resend
- Silent success on resend (resets countdown)

**Error Display:**

```typescript
const [error, setError] = useState<string>('')

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

// In render:
<input
  className={`
    ${error ? 'border-destructive' : 'border-input'}
  `}
/>
{error && (
  <p className="mt-2 text-sm text-destructive text-center">
    {error}
  </p>
)}
```

## Form Patterns with TanStack Form

### Installation

```bash
pnpm add @tanstack/react-form --filter=@nebula/desktop
```

### Sign In/Sign Up Form

```typescript
import { useForm } from '@tanstack/react-form'

const form = useForm({
  defaultValues: {
    email: '',
    password: '',
    confirmPassword: '', // sign-up only
  },
  validators: {
    onChange: ({ value }) => {
      if (mode === 'sign-up' && value.password !== value.confirmPassword) {
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

    const result = await authClient.signIn.email({
      email: value.email,
      password: value.password,
    })

    if (result.error) {
      if (result.error.status === 403) {
        // Unverified email - silent navigation
        navigate({ to: '/verify-email', state: { email: value.email } })
      } else {
        // General error - show below submit button
        setFormError('Incorrect email or password')
      }
    }
    // Success: session watcher navigates to dashboard
  },
})
```

### Field Rendering

```typescript
<form.Field name="email">
  {(field) => (
    <Input
      label="Email"
      value={field.state.value}
      onChange={(val) => field.handleChange(val)}
      error={field.state.meta.errors[0]}
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
      hint={mode === 'sign-in' ? 'Forgot password?' : undefined}
      onHintClick={() => navigate({ to: '/forgot-password' })}
    />
  )}
</form.Field>
```

### Form Error Display

```typescript
<form onSubmit={(e) => {
  e.preventDefault()
  form.handleSubmit()
}}>
  {/* fields */}

  {formError && (
    <p className="mt-4 text-sm text-destructive">
      {formError}
    </p>
  )}

  <Button type="submit" variant="primary" className="w-full mt-4">
    Sign in
  </Button>
</form>
```

## Route State Handling

### Passing Email Between Routes

```typescript
// Login → Verify Email
navigate({
  to: '/verify-email',
  state: { email: value.email },
})

// Forgot Password → Reset Password
navigate({
  to: '/reset-password',
  state: { email: value.email, otp: verifiedOtp },
})
```

### Reading State in Target Route

```typescript
function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  // Redirect if email missing (shouldn't happen)
  useEffect(() => {
    if (!email) {
      navigate({ to: '/signup' })
    }
  }, [email, navigate])

  // ... rest of component
}
```

## Error Types & Messages

| Scenario               | Error Type | Location               | Message                           |
| ---------------------- | ---------- | ---------------------- | --------------------------------- |
| Passwords don't match  | Field      | Below confirm password | "Passwords do not match"          |
| Invalid credentials    | Form       | Below submit           | "Incorrect email or password"     |
| Unverified email       | Navigation | N/A                    | Silent nav to /verify-email       |
| Invalid OTP            | OTP        | Below OTP input        | "Invalid verification code"       |
| OTP length check       | OTP        | Below OTP input        | "Please enter a 6-digit code"     |
| Network error          | Form       | Below submit           | "An unexpected error occurred"    |
| Verification sent      | Success    | N/A                    | Silent (countdown reset)          |
| Password reset success | Success    | N/A                    | Silent nav to /login or dashboard |

## Migration Checklist

- [ ] Update Input component with error/hint props
- [ ] Install @tanstack/react-form
- [ ] Convert login form to TanStack Form
- [ ] Convert signup form to TanStack Form
- [ ] Convert forgot password form to TanStack Form
- [ ] Convert reset password form to TanStack Form
- [ ] Update OtpVerificationScreen with error state
- [ ] Remove all `useToast()` imports from auth routes
- [ ] Update route navigation to pass email via state
- [ ] Add email validation on target routes
- [ ] Test all auth flows end-to-end
- [ ] Remove Toast component if no longer used elsewhere

## Benefits

- **Clearer feedback**: Errors appear next to the problem
- **Better UX**: Standard pattern users expect
- **Accessible**: Screen readers can associate errors with inputs
- **Type-safe**: TanStack Form provides compile-time validation
- **Simpler code**: Less state management, automatic error clearing
- **Consistent**: All forms follow the same pattern
