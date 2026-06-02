import type { IAIProvider } from './port'
import { aiMockAdapter } from './mock-adapter'

export function getAIProvider(): IAIProvider {
  const provider = process.env['PROVIDER_LLM'] ?? 'mock'
  switch (provider) {
    case 'mock':
      return aiMockAdapter
    default:
      throw new Error(
        `AI provider "${provider}" not yet implemented — only "mock" is wired (an LLM adapter is the production target). Set PROVIDER_LLM=mock or unset to use the default.`
      )
  }
}
