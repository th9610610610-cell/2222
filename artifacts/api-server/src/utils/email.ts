import nodemailer from 'nodemailer'

const DEV = process.env.NODE_ENV !== 'production'
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'Lotto Win <noreply@lottowin.app>'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

export async function sendOTPEmail(to: string, otp: string, type: string): Promise<boolean> {
  const subject = type === 'email_verify' ? 'Verify Your Lotto Win Account'
    : type === 'password_reset' ? 'Reset Your Lotto Win Password'
    : type === 'new_device' ? 'New Device Login — Lotto Win'
    : 'Lotto Win Security Code'

  const action = type === 'email_verify' ? 'verify your email address'
    : type === 'password_reset' ? 'reset your password'
    : type === 'new_device' ? 'confirm your new device login'
    : 'confirm your action'

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#08071a;color:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#f0a500,#e8187a);padding:20px 24px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:800;">♛ Lotto Win</h1>
      </div>
      <div style="padding:28px 24px;">
        <h2 style="color:#f0a500;font-size:18px;margin-bottom:12px;">${subject}</h2>
        <p style="color:#ccc;font-size:14px;line-height:1.6;">Use the code below to ${action}. This code expires in <strong style="color:#fff;">10 minutes</strong>.</p>
        <div style="background:#1a0b38;border:2px dashed rgba(240,165,0,0.5);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
          <span style="font-family:monospace;font-size:36px;font-weight:900;color:#f0a500;letter-spacing:8px;">${otp}</span>
        </div>
        <p style="color:#888;font-size:12px;">If you did not request this, please ignore this email. Do not share this code with anyone.</p>
      </div>
      <div style="background:#100f28;padding:12px 24px;text-align:center;">
        <p style="color:#555;font-size:11px;margin:0;">© 2025 Lotto Win · Bangladesh</p>
      </div>
    </div>
  `

  const t = getTransporter()
  if (!t) {
    if (DEV) {
      console.log(`\n[EMAIL DEV] To: ${to} | Subject: ${subject} | OTP: ${otp}\n`)
      return true
    }
    console.error('[email] No SMTP transporter configured')
    return false
  }
  try {
    await t.sendMail({ from: SMTP_FROM, to, subject, html })
    return true
  } catch (err) {
    console.error('[email] Send failed:', err)
    return false
  }
}
