import type { IAIProvider } from './port'

export function getAIProvider(): IAIProvider {
  const provider = process.env['PROVIDER_LLM'] ?? 'mock'
  switch (provider) {
    case 'mock':
    default:
      throw new Error('AI mock adapter not yet implemented — Phase B')
  }
}
