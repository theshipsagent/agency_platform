import type { IStorageProvider } from './port'

export function getStorageProvider(): IStorageProvider {
  const provider = process.env['PROVIDER_STORAGE'] ?? 'local'
  switch (provider) {
    case 'local':
    default:
      throw new Error('Storage local adapter not yet implemented — Phase B')
  }
}
