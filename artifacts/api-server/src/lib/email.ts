import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
  const subjects: Record<string, string> = {
    register: 'Verify your Lotto Win account',
    login: 'Lotto Win login verification',
    reset: 'Reset your Lotto Win password',
    withdraw: 'Confirm your Lotto Win withdrawal',
    sensitive: 'Lotto Win security verification',
  }
  const labels: Record<string, string> = {
    register: 'complete your registration',
    login: 'verify your new device login',
    reset: 'reset your password',
    withdraw: 'confirm your withdrawal',
    sensitive: 'verify this action',
  }
  const subject = subjects[purpose] ?? 'Lotto Win OTP'
  const label = labels[purpose] ?? 'verify'

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">🎟️ Lotto Win</h2>
        <p style="color:#444">Use the code below to ${label}:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#7c3aed;text-align:center;padding:24px;background:#fff;border-radius:8px;margin:16px 0">${otp}</div>
        <p style="color:#666;font-size:13px">This code expires in <strong>10 minutes</strong>. Never share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">If you did not request this, please ignore this email.</p>
      </div>
    `,
  })
}
