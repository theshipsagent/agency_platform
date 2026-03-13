import type { IAISProvider } from './port'

export function getAISProvider(): IAISProvider {
  const provider = process.env['PROVIDER_AIS'] ?? 'mock'
  switch (provider) {
    case 'mock':
    default:
      throw new Error('AIS mock adapter not yet implemented — Phase B')
  }
}
