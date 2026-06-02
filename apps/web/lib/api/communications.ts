// Shared row shape + marshaller for the communications table.
//
// Unlike most entities (whose Row type is kept inline in the single route that
// reads them), communications are read by BOTH the inbox list route and the
// sync route, so the snake→camel marshaller lives here to avoid drift between
// the two. The runtime returns snake_case columns from pg.Pool; the wire/UI
// shape is camelCase.

import type { CommunicationStatus } from '@shipops/shared'

// The full ClassifyEmailResult the AI port returned, stored verbatim in the
// jsonb `classification` column. Kept loose (optional fields) because the
// mock's output shape may evolve and old rows shouldn't fail to deserialize.
export interface StoredClassification {
  isPortCallRelated?: boolean
  portCallNumber?: string | null
  suggestedDocumentType?: string | null
  extractedEta?: string | null
  extractedFigures?: Record<string, number>
  summary?: string
  confidence?: number
}

export interface CommunicationRow {
  id: string
  tenant_id: string
  external_id: string
  from_addr: string
  to_addrs: string[]
  cc_addrs: string[]
  subject: string
  body_text: string
  body_html: string | null
  received_at: Date
  classification: StoredClassification | null
  status: string
  port_call_id: string | null
  created_at: Date
  updated_at: Date
}

// Column list shared by every SELECT so the shape always matches CommunicationRow.
// status is an enum — ::text so pg returns the string, not the OID.
export const COMMUNICATION_COLUMNS = `
  id, tenant_id, external_id, from_addr, to_addrs, cc_addrs,
  subject, body_text, body_html, received_at,
  classification, status::text AS status, port_call_id,
  created_at, updated_at
`

export function toCommunication(r: CommunicationRow) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    externalId: r.external_id,
    fromAddr: r.from_addr,
    toAddrs: r.to_addrs,
    ccAddrs: r.cc_addrs,
    subject: r.subject,
    bodyText: r.body_text,
    bodyHtml: r.body_html,
    receivedAt: r.received_at,
    classification: r.classification,
    status: r.status as CommunicationStatus,
    portCallId: r.port_call_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
