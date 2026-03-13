import type { ISanctionsProvider } from './port'

export function getSanctionsProvider(): ISanctionsProvider {
  const provider = process.env['PROVIDER_SANCTIONS'] ?? 'mock'
  switch (provider) {
    case 'mock':
    default:
      throw new Error('Sanctions mock adapter not yet implemented — Phase B')
  }
}
