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
              ${
                error
                  ? 'border-destructive focus:border-destructive focus:ring-destructive'
                  : 'border-input focus:border-input-focus focus:ring-ring'
              }
            `}
          />
          {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
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
