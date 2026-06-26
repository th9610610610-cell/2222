import nodemailer from 'nodemailer'
import crypto from 'crypto'

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
    register: 'Your Lotto Win account confirmation code',
    login: 'Your Lotto Win sign-in code',
    reset: 'Reset your Lotto Win password',
    withdraw: 'Confirm your Lotto Win withdrawal',
    sensitive: 'Lotto Win security confirmation code',
  }
  const labels: Record<string, string> = {
    register: 'complete your registration',
    login: 'verify your sign-in',
    reset: 'reset your password',
    withdraw: 'confirm your withdrawal',
    sensitive: 'verify this action',
  }
  const subject = subjects[purpose] ?? 'Your Lotto Win confirmation code'
  const label = labels[purpose] ?? 'verify your request'

  const messageId = `<${crypto.randomUUID()}@lottowin.app>`

  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"Lotto Win" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    messageId,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'LottoWin Mailer',
      'X-Entity-Ref-ID': messageId,
      'Precedence': 'transactional',
    },
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f8;font-family:Arial,Helvetica,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f8;padding:32px 0">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
              <tr>
                <td style="background:#7c3aed;padding:28px;text-align:center">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px">Lotto Win</h1>
                  <p style="margin:4px 0 0;color:#e5d8ff;font-size:13px;font-weight:400">Official Notification</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;text-align:center">
                  <p style="color:#333333;font-size:16px;margin:0 0 8px">Please use the code below to <strong>${label}</strong>:</p>
                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto">
                    <tr>
                      <td style="background:#f8f0ff;border:2px solid #7c3aed;border-radius:12px;padding:20px 40px;text-align:center">
                        <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#7c3aed;font-family:Courier New,Courier,monospace">${otp}</span>
                      </td>
                    </tr>
                  </table>
                  <p style="color:#666666;font-size:14px;margin:0 0 4px">This code expires in <strong>10 minutes</strong>.</p>
                  <p style="color:#999999;font-size:13px;margin:0">Do not share this code with anyone.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#fafafa;padding:16px 40px;border-top:1px solid #eeeeee">
                  <p style="color:#aaaaaa;font-size:12px;margin:0;text-align:center">
                    If you did not request this, please ignore this email. No action is required.<br>
                    This is an automated message from Lotto Win. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
            <p style="color:#cccccc;font-size:11px;margin:16px 0 0;text-align:center">
              Lotto Win &mdash; lottowinsbd@gmail.com
            </p>
          </td></tr>
        </table>
      </body>
      </html>
    `,
    text: [
      `Lotto Win - ${subject}`,
      ``,
      `Your confirmation code to ${label}:`,
      ``,
      `  ${otp}`,
      ``,
      `This code expires in 10 minutes.`,
      `Do not share this code with anyone.`,
      ``,
      `If you did not request this, please ignore this email.`,
      ``,
      `-- Lotto Win Team`,
    ].join('\n'),
  })
  transporter.close()
}
