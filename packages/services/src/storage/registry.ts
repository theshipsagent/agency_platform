import type { IStorageProvider } from './port'
import { localFsStorageAdapter } from './local-fs-adapter'

export function getStorageProvider(): IStorageProvider {
  const provider = process.env['PROVIDER_STORAGE'] ?? 'local'
  switch (provider) {
    case 'local':
      return localFsStorageAdapter
    default:
      throw new Error(
        `Storage provider "${provider}" not yet implemented — only "local" is wired (S3-class adapter is the production target). Set PROVIDER_STORAGE=local or unset to use the default.`
      )
  }
}
