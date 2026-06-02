import type { IEmailProvider } from './port'
import { emailMockAdapter } from './mock-adapter'

export function getEmailProvider(): IEmailProvider {
  const provider = process.env['PROVIDER_EMAIL'] ?? 'mock'
  switch (provider) {
    case 'mock':
      return emailMockAdapter
    default:
      throw new Error(
        `Email provider "${provider}" not yet implemented — only "mock" is wired (IMAP/Graph is the production target). Set PROVIDER_EMAIL=mock or unset to use the default.`
      )
  }
}
