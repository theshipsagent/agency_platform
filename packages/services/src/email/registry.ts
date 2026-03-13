import type { IEmailProvider } from './port'

export function getEmailProvider(): IEmailProvider {
  const provider = process.env['PROVIDER_EMAIL'] ?? 'mock'
  switch (provider) {
    case 'mock':
    default:
      throw new Error('Email mock adapter not yet implemented — Phase B')
  }
}
