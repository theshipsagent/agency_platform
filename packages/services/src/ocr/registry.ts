import type { IOCRProvider } from './port'

export function getOCRProvider(): IOCRProvider {
  const provider = process.env['PROVIDER_OCR'] ?? 'mock'
  switch (provider) {
    case 'mock':
    default:
      throw new Error('OCR mock adapter not yet implemented — Phase B')
  }
}
