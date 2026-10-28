import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

interface MailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const port = Number(process.env.SMTP_PORT) || 587

  if (host && user) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  } else {
    // Logged JSON transport fallback when SMTP is unset
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    })
  }

  return transporter
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  try {
    const from = process.env.SMTP_FROM || '"AICTE Statutory Registry" <noreply@aicte-india.org>'
    const tx = getTransporter()

    const info = await tx.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    if ((tx as any).options?.jsonTransport) {
      console.log(`[MAILER:JSON] Email to ${options.to} (Subject: "${options.subject}"):`, info.message)
    } else {
      console.log(`[MAILER:SMTP] Email sent to ${options.to} (MessageId: ${info.messageId})`)
    }

    return true
  } catch (err) {
    console.error(`[MAILER] Failed to send email to ${options.to}:`, err)
    return false
  }
}
