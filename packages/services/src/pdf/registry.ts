import type { IPDFProvider } from './port'

export function getPDFProvider(): IPDFProvider {
  const provider = process.env['PROVIDER_PDF'] ?? 'react_pdf'
  switch (provider) {
    case 'react_pdf':
    default:
      throw new Error('PDF adapter not yet implemented — Phase B')
  }
}
