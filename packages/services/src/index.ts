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
//
// Lazy-per-provider: the registry modules are dynamically imported in
// parallel up front, but each provider's `getXProvider()` factory only runs
// the first time the corresponding registry property is accessed (via a TS
// getter). This lets features that need only one or two adapters ship
// without first stub-implementing the other five — an unimplemented
// adapter's throw is reached only when *that* property is touched, not
// when getServices() resolves.

export interface ServiceRegistry {
  readonly ais: IAISProvider
  readonly email: IEmailProvider
  readonly ocr: IOCRProvider
  readonly ai: IAIProvider
  readonly storage: IStorageProvider
  readonly pdf: IPDFProvider
  readonly sanctions: ISanctionsProvider
}

// Memoize a factory: it runs at most once, even if it throws — subsequent
// accesses re-throw the cached error. That preserves the principle of
// least surprise vs. silently retrying a misconfigured provider.
function memo<T>(factory: () => T): () => T {
  let value: T
  let err: unknown
  let state: 'pending' | 'resolved' | 'rejected' = 'pending'
  return () => {
    if (state === 'resolved') return value
    if (state === 'rejected') throw err
    try {
      value = factory()
      state = 'resolved'
      return value
    } catch (e) {
      err = e
      state = 'rejected'
      throw e
    }
  }
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

  const ais = memo(getAISProvider)
  const email = memo(getEmailProvider)
  const ocr = memo(getOCRProvider)
  const ai = memo(getAIProvider)
  const storage = memo(getStorageProvider)
  const pdf = memo(getPDFProvider)
  const sanctions = memo(getSanctionsProvider)

  _registry = {
    get ais() { return ais() },
    get email() { return email() },
    get ocr() { return ocr() },
    get ai() { return ai() },
    get storage() { return storage() },
    get pdf() { return pdf() },
    get sanctions() { return sanctions() },
  }

  return _registry
}

// Reset for testing
export function resetServiceRegistry() {
  _registry = null
}
