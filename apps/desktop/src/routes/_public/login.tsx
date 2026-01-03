import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { z } from 'zod'
import { authClient } from '../../lib/auth-client'
import { useToast } from '../../components/Toast'
import { TerminalInput } from '../../components/TerminalInput'
import { NebulaLogo } from '../../components/NebulaLogo'
import { TerminalButton } from '../../components/TerminalButton'

const signInSchema = z.object({
  email: z.string().min(1, 'email is required').email('invalid email format'),
  password: z.string().min(1, 'password is required'),
})

const signUpSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().min(1, 'email is required').email('invalid email format'),
  password: z.string().min(8, 'password must be at least 8 characters'),
})

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: session } = authClient.useSession()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
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

    // Validate before sending
    const schema = isSignUp ? signUpSchema : signInSchema
    const data = isSignUp ? { name, email, password } : { email, password }
    const validation = schema.safeParse(data)

    if (!validation.success) {
      const firstError = validation.error.issues[0]
      toast.error(firstError?.message || 'validation failed')
      return
    }

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (result.error) {
          toast.error(result.error.message || 'sign up failed')
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
            toast.error('please verify your email before signing in')
            setPendingVerification(true)
          } else if (result.error.status === 401 || result.error.status === 400) {
            toast.error('incorrect email or password')
          } else {
            toast.error(result.error.message || 'sign in failed')
          }
        }
        // On success, the useEffect watching session will navigate us
      }
    } catch (error) {
      console.error('Sign in/up error:', error)
      toast.error('an unexpected error occurred')
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
        toast.error(result.error.message || 'failed to send verification code')
      } else {
        toast.success('verification code sent')
        setCountdown(30)
      }
    } catch {
      toast.error('failed to send verification code')
    }
  }

  const handleVerifyOtp = async () => {
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
      // On success, the useEffect watching session will navigate us
    } catch {
      toast.error('verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  if (pendingVerification) {
    return (
      <div className="text-sm w-[380px]">
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <NebulaLogo />
          </div>

          <div className="text-white mb-4">
            <span className="text-gray-400">// </span>
            verification code sent to {email}
          </div>

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
          <NebulaLogo />
        </div>

        <div className="text-white mb-4">
          <span className="text-primary">$ </span>
          {isSignUp ? 'create_account' : 'sign_in'}
        </div>

        {isSignUp && <TerminalInput label="name" value={name} onChange={setName} />}

        <TerminalInput label="email" value={email} onChange={setEmail} autoFocus />

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
