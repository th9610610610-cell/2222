import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  })
}

export async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
  const subjects: Record<string, string> = {
    register: '🎟️ Your Lotto Win verification code',
    login: '🔐 Your Lotto Win login code',
    reset: '🔑 Reset your Lotto Win password',
    withdraw: '💸 Confirm your Lotto Win withdrawal',
    sensitive: '🔒 Lotto Win security code',
  }
  const labels: Record<string, string> = {
    register: 'complete your registration',
    login: 'verify your login',
    reset: 'reset your password',
    withdraw: 'confirm your withdrawal',
    sensitive: 'verify this action',
  }
  const subject = subjects[purpose] ?? '🎟️ Lotto Win OTP'
  const label = labels[purpose] ?? 'verify'

  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"Lotto Win" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f8;font-family:Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:32px 0">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed,#e8187a);padding:28px;text-align:center">
                  <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:1px">🎟️ Lotto Win</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;text-align:center">
                  <p style="color:#333;font-size:16px;margin:0 0 8px">Use this code to <strong>${label}</strong>:</p>
                  <div style="display:inline-block;background:#f8f0ff;border:2px solid #7c3aed;border-radius:12px;padding:20px 40px;margin:20px 0">
                    <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#7c3aed;font-family:monospace">${otp}</span>
                  </div>
                  <p style="color:#666;font-size:14px;margin:0 0 4px">⏱️ This code expires in <strong>10 minutes</strong></p>
                  <p style="color:#999;font-size:13px;margin:0">Never share this code with anyone</p>
                </td>
              </tr>
              <tr>
                <td style="background:#fafafa;padding:16px 40px;text-align:center;border-top:1px solid #eee">
                  <p style="color:#bbb;font-size:12px;margin:0">If you didn't request this, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
    text: `Your Lotto Win verification code is: ${otp}\n\nThis code expires in 10 minutes. Never share it with anyone.`,
  })
  transporter.close()
}
