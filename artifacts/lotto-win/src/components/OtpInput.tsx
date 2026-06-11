import { useRef, useEffect, useState, useCallback } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

export default function OtpInput({ length = 6, value, onChange, disabled }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(length, '').split('').slice(0, length)

  const focus = (i: number) => inputs.current[i]?.focus()

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = ch
    onChange(next.join('').replace(/ /g, ''))
    if (ch && i < length - 1) focus(i + 1)
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) focus(i - 1)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    focus(Math.min(pasted.length, length - 1))
  }

  useEffect(() => { focus(0) }, [])

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          style={{
            width: '44px', height: '52px', textAlign: 'center',
            fontSize: '22px', fontWeight: 700,
            background: digits[i] && digits[i] !== ' ' ? 'rgba(155,32,216,0.15)' : '#08071a',
            border: `2px solid ${digits[i] && digits[i] !== ' ' ? '#9b20d8' : 'rgba(155,32,216,0.3)'}`,
            borderRadius: '10px', color: '#fff', outline: 'none',
            transition: 'border-color 0.2s, background 0.2s',
            caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  )
}

interface OtpTimerProps {
  seconds: number
  onResend: () => void
  loading?: boolean
}

export function OtpTimer({ seconds, onResend, loading }: OtpTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [seconds])

  return (
    <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#8888aa' }}>
      {remaining > 0 ? (
        <span>Resend OTP in <strong style={{ color: '#f0a500' }}>{remaining}s</strong></span>
      ) : (
        <span
          onClick={!loading ? onResend : undefined}
          style={{ color: '#9b20d8', cursor: loading ? 'default' : 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Sending...' : 'Resend OTP'}
        </span>
      )}
    </div>
  )
}
