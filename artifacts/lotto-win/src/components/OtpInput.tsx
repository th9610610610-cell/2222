import { useRef, useEffect, useState, useCallback } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (val: string) => void
  onComplete?: (val: string) => void
  disabled?: boolean
}

export default function OtpInput({ length = 6, value, onChange, onComplete, disabled }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(length, '').split('').slice(0, length)

  const focus = (i: number) => inputs.current[i]?.focus()

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = ch
    const newVal = next.join('').replace(/ /g, '')
    onChange(newVal)
    if (ch && i < length - 1) focus(i + 1)
    if (ch && i === length - 1) {
      const full = next.filter(d => d && d !== ' ').join('')
      if (full.length === length) onComplete?.(full)
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (digits[i] && digits[i] !== ' ') {
        const next = [...digits]
        next[i] = ''
        onChange(next.join('').replace(/ /g, ''))
      } else if (i > 0) {
        focus(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1)
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focus(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    const nextFocus = Math.min(pasted.length, length - 1)
    setTimeout(() => focus(nextFocus), 0)
    if (pasted.length === length) onComplete?.(pasted)
  }

  useEffect(() => { setTimeout(() => focus(0), 100) }, [])

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => {
        const filled = digits[i] && digits[i] !== ' '
        return (
          <input
            key={i}
            ref={el => { inputs.current[i] = el }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={filled ? digits[i] : ''}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            disabled={disabled}
            style={{
              width: '46px', height: '56px', textAlign: 'center',
              fontSize: '24px', fontWeight: 800,
              background: filled ? 'rgba(124,58,237,0.15)' : '#08071a',
              border: `2px solid ${filled ? '#7c3aed' : 'rgba(155,32,216,0.25)'}`,
              borderRadius: '12px', color: '#fff', outline: 'none',
              transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
              caretColor: 'transparent',
              transform: filled ? 'scale(1.05)' : 'scale(1)',
              boxShadow: filled ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
            }}
          />
        )
      })}
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

  const pct = (remaining / seconds) * 100

  return (
    <div style={{ textAlign: 'center' }}>
      {remaining > 0 ? (
        <div>
          <div style={{ width: '100%', height: '3px', background: 'rgba(155,32,216,0.15)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#e8187a)', borderRadius: '2px', transition: 'width 1s linear' }} />
          </div>
          <span style={{ fontSize: '13px', color: '#8888aa' }}>
            Resend in <strong style={{ color: '#f0a500' }}>{remaining}s</strong>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={!loading ? onResend : undefined}
          disabled={loading}
          style={{
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.4)',
            borderRadius: '8px', padding: '8px 20px', color: '#9b20d8',
            cursor: loading ? 'default' : 'pointer', fontWeight: 700,
            fontSize: '13px', width: '100%', transition: 'all 0.2s',
          }}
        >
          {loading ? 'Sending...' : '🔄 Resend OTP'}
        </button>
      )}
    </div>
  )
}
