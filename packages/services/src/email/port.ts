export interface EmailMessage {
  id: string
  from: string
  to: string[]
  cc: string[]
  subject: string
  bodyText: string
  bodyHtml: string | null
  attachments: EmailAttachment[]
  receivedAt: Date
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  sizeBytes: number
  content: Buffer
}

export interface SendEmailInput {
  to: string | string[]
  cc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  attachments?: { filename: string; content: Buffer; mimeType: string }[]
}

export interface IEmailProvider {
  sendEmail(input: SendEmailInput): Promise<{ messageId: string }>
  getUnreadMessages(): Promise<EmailMessage[]>
  markAsRead(messageId: string): Promise<void>
}
