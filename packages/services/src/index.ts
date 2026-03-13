import type { IAISProvider } from './ais/port'
import type { IEmailProvider } from './email/port'
import type { IOCRProvider } from './ocr/port'
import type { IAIProvider } from './ai/port'
import type { IStorageProvider } from './storage/port'
import type { IPDFProvider } from './pdf/port'
import type { ISanctionsProvider } from './sanctions/port'

export type { IAISProvider } from './ais/port'
export type { IEmailProvider, EmailMessage, EmailAttachment, SendEmailInput } from './email/port'
export type { IOCRProvider, ExtractedInvoice, ExtractedLineItem } from './ocr/port'
export type { IAIProvider, ClassifyEmailResult, SuggestedAction } from './ai/port'
export type { IStorageProvider, UploadResult } from './storage/port'
export type { IPDFProvider, GenerateFDAInput, GenerateSOFInput } from './pdf/port'
export type { ISanctionsProvider, SanctionsCheckResult } from './sanctions/port'

// ─── Service Registry ─────────────────────────────────────────────────────────
// Reads PROVIDER_* env vars and returns the correct adapter.
// Adapters are lazy-loaded so unused providers don't add bundle weight.

export interface ServiceRegistry {
  ais: IAISProvider
  email: IEmailProvider
  ocr: IOCRProvider
  ai: IAIProvider
  storage: IStorageProvider
  pdf: IPDFProvider
  sanctions: ISanctionsProvider
}

let _registry: ServiceRegistry | null = null

export async function getServices(): Promise<ServiceRegistry> {
  if (_registry) return _registry

  const [
    { getAISProvider },
    { getEmailProvider },
    { getOCRProvider },
    { getAIProvider },
    { getStorageProvider },
    { getPDFProvider },
    { getSanctionsProvider },
  ] = await Promise.all([
    import('./ais/registry'),
    import('./email/registry'),
    import('./ocr/registry'),
    import('./ai/registry'),
    import('./storage/registry'),
    import('./pdf/registry'),
    import('./sanctions/registry'),
  ])

  _registry = {
    ais: getAISProvider(),
    email: getEmailProvider(),
    ocr: getOCRProvider(),
    ai: getAIProvider(),
    storage: getStorageProvider(),
    pdf: getPDFProvider(),
    sanctions: getSanctionsProvider(),
  }

  return _registry
}

// Reset for testing
export function resetServiceRegistry() {
  _registry = null
}
