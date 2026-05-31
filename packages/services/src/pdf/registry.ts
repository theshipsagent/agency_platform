import type { IPDFProvider } from './port'
import { pdfMockAdapter } from './mock-adapter'

export function getPDFProvider(): IPDFProvider {
  const provider = process.env['PROVIDER_PDF'] ?? 'mock'
  switch (provider) {
    case 'mock':
      return pdfMockAdapter
    default:
      throw new Error(
        `Unknown PROVIDER_PDF="${provider}". Supported: 'mock'.`
      )
  }
}
