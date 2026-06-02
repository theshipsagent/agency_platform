// Smoke test for the inbox-triage adapters (email mock + AI mock).
// Run with: pnpm --filter @shipops/services smoke-inbox
//
// Exercises the two adapters the way the ingest route will:
//   1. email.getUnreadMessages() returns the fixed inbox
//   2. ai.classifyEmail(subject, body) yields the expected verdict per message
//   3. markAsRead removes a message from the unread set (idempotent ingest)
//
// The per-fixture expectations below pin the classifier's behaviour so a future
// edit to the keyword tables can't silently regress triage. Each assertion
// prints ✓/✗; non-zero exit on any failure.

import { emailMockAdapter } from '../src/email/mock-adapter'
import { aiMockAdapter } from '../src/ai/mock-adapter'

let failures = 0
function check(label: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

interface Expectation {
  id: string
  isPortCallRelated: boolean
  portCallNumber: string | null
  suggestedDocumentType: string | null
  hasPrimaryAmountCents?: number
  hasEta?: boolean
}

const EXPECTED: Expectation[] = [
  // msg-0001 NOR: body says "ETA berth ... 1400 LT" — a clock time with NO date,
  // so the extractor honestly returns null rather than invent a date. hasEta:false.
  { id: 'msg-0001', isPortCallRelated: true,  portCallNumber: 'PC-2026-0005', suggestedDocumentType: 'NOR' },
  { id: 'msg-0002', isPortCallRelated: true,  portCallNumber: 'PC-2026-0004', suggestedDocumentType: 'INVOICE', hasPrimaryAmountCents: 1425000 },
  { id: 'msg-0003', isPortCallRelated: true,  portCallNumber: null,           suggestedDocumentType: null,      hasEta: true },
  // msg-0004 KNOWN KEYWORD COLLISION: a pilot-booking email that mentions
  // "...will follow under separate invoice" classifies as INVOICE. The keyword
  // classifier can't distinguish "is an invoice" from "mentions an invoice" —
  // a real LLM adapter would. Pinned here so the limitation is visible, not hidden.
  { id: 'msg-0004', isPortCallRelated: true,  portCallNumber: 'PC-2026-0006', suggestedDocumentType: 'INVOICE', hasPrimaryAmountCents: 380000 },
  { id: 'msg-0005', isPortCallRelated: false, portCallNumber: null,           suggestedDocumentType: null },
]

async function main() {
  const unread = await emailMockAdapter.getUnreadMessages()
  check('inbox returns 5 unread fixtures', unread.length === 5, `got ${unread.length}`)

  for (const exp of EXPECTED) {
    const msg = unread.find((m) => m.id === exp.id)
    if (!msg) {
      check(`${exp.id} present in inbox`, false)
      continue
    }
    const result = await aiMockAdapter.classifyEmail(msg.subject, msg.bodyText)

    check(`${exp.id} isPortCallRelated=${exp.isPortCallRelated}`,
      result.isPortCallRelated === exp.isPortCallRelated,
      `got ${result.isPortCallRelated} (conf ${result.confidence})`)

    check(`${exp.id} portCallNumber=${exp.portCallNumber}`,
      result.portCallNumber === exp.portCallNumber,
      `got ${result.portCallNumber}`)

    check(`${exp.id} suggestedDocumentType=${exp.suggestedDocumentType}`,
      result.suggestedDocumentType === exp.suggestedDocumentType,
      `got ${result.suggestedDocumentType}`)

    if (exp.hasPrimaryAmountCents !== undefined) {
      check(`${exp.id} extracted primaryAmount=${exp.hasPrimaryAmountCents}¢`,
        result.extractedFigures['primaryAmount'] === exp.hasPrimaryAmountCents,
        `got ${result.extractedFigures['primaryAmount']}`)
    }
    if (exp.hasEta) {
      check(`${exp.id} extracted an ETA`, result.extractedEta !== null,
        result.extractedEta ? result.extractedEta.toISOString() : 'null')
    }
  }

  // markAsRead removes from unread (idempotent ingest relies on this).
  await emailMockAdapter.markAsRead('msg-0001')
  const afterRead = await emailMockAdapter.getUnreadMessages()
  check('markAsRead removes msg-0001 from unread', !afterRead.some((m) => m.id === 'msg-0001'),
    `now ${afterRead.length} unread`)

  console.log(`\n${failures === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${failures} FAILURE(S)`}`)
  if (failures > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
