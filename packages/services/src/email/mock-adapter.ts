// Mock adapter for the email port.
//
// Unlike the storage local-fs adapter (a real persistence layer), this IS
// fake data: a fixed inbox of realistic Gulf Coast agency emails. It exists so
// the inbox-triage feature can be built, demoed, and tested end-to-end without
// an IMAP/Graph credential or a live mailbox. Production swaps in a real
// provider via PROVIDER_EMAIL; the route + UI never change.
//
// Fixtures intentionally reference REAL seed port calls (PC-2026-0004/0005,
// vessels MV OLDENDORFF NAVIGATOR / MV GENCO THUNDER, etc.) so the AI port's
// extracted port_call_number actually resolves to a linkable port call. One
// fixture (the newsletter) is deliberately NOT port-call-related, to exercise
// the classifier's negative path and the "nothing to link" UI state.

import type {
  IEmailProvider,
  EmailMessage,
  SendEmailInput,
} from './port'

// Stable timestamps (no Date.now() — fixtures must be deterministic so the
// triage UI and any snapshot test render identically every run).
const T = (iso: string): Date => new Date(iso)

// markAsRead mutates this in-memory set; getUnreadMessages filters against it.
// Module-level state is fine for a mock — it resets on process restart, which
// is exactly the dev/demo behaviour we want.
const readIds = new Set<string>()

const INBOX: EmailMessage[] = [
  {
    id: 'msg-0001',
    from: 'capt.santos@genco-thunder.example',
    to: ['ops@gulfcoastagency.example'],
    cc: [],
    subject: 'NOR Tendered — MV GENCO THUNDER — PC-2026-0005 — Houston Bayport',
    bodyText:
      'Good morning,\n\nNotice of Readiness tendered at 0640 LT this morning, vessel all fast ' +
      'awaiting berth at Bayport. ETA berth per pilot is 1400 LT. Please confirm receipt of NOR ' +
      'and advise berthing prospects.\n\nBest regards,\nCapt. Santos\nMaster, MV GENCO THUNDER',
    bodyHtml: null,
    attachments: [
      {
        filename: 'NOR_GENCO_THUNDER_2026-04-15.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 48213,
        content: Buffer.from('%PDF-1.4 mock NOR document'),
      },
    ],
    receivedAt: T('2026-04-15T11:42:00Z'),
  },
  {
    id: 'msg-0002',
    from: 'billing@crescenttowing.example',
    to: ['accounts@gulfcoastagency.example'],
    cc: ['ops@gulfcoastagency.example'],
    subject: 'Invoice #CT-88421 — Tug services MV OLDENDORFF NAVIGATOR (PC-2026-0004)',
    bodyText:
      'Please find attached our invoice for tug assistance rendered to MV OLDENDORFF NAVIGATOR ' +
      'at New Orleans (Nashville Ave).\n\nInvoice total: USD 14,250.00\nTerms: Net 30\n\n' +
      'Two tugs, berthing and unberthing. Kindly remit to the account on file.\n\n' +
      'Regards,\nAccounts Receivable\nCrescent Towing',
    bodyHtml: null,
    attachments: [
      {
        filename: 'CT-88421.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 61104,
        content: Buffer.from('%PDF-1.4 mock invoice document'),
      },
    ],
    receivedAt: T('2026-04-16T14:08:00Z'),
  },
  {
    id: 'msg-0003',
    from: 'chartering@norden.example',
    to: ['ops@gulfcoastagency.example'],
    cc: [],
    subject: 'ETA update — KLAVENESS CHALLENGER — Mobile, McDuffie',
    bodyText:
      'Team,\n\nRevised ETA for the KLAVENESS CHALLENGER at Mobile is now 18 April 0600 LT, ' +
      'down from 17 April due to weather routing across the Gulf. Cargo is 52,000 MT pet coke ' +
      'for McDuffie Coal Terminal. Please update appointment paperwork accordingly.\n\n' +
      'Thanks,\nChartering Desk\nNorden',
    bodyHtml: null,
    attachments: [],
    receivedAt: T('2026-04-16T16:33:00Z'),
  },
  {
    id: 'msg-0004',
    from: 'pilots@barpilots.example',
    to: ['ops@gulfcoastagency.example'],
    cc: [],
    subject: 'Pilot booking confirmation — outbound — PC-2026-0006',
    bodyText:
      'Pilot ordered for MV NORDEN PACIFIC outbound transit, Mobile bar, 17 April 2200 LT. ' +
      'Boarding ground SW Pass. Pilotage fee USD 3,800.00 will follow under separate invoice.\n\n' +
      'Mobile Bar Pilots Association',
    bodyHtml: null,
    attachments: [],
    receivedAt: T('2026-04-16T18:20:00Z'),
  },
  {
    id: 'msg-0005',
    from: 'newsletter@maritimebulletin.example',
    to: ['ops@gulfcoastagency.example'],
    cc: [],
    subject: 'This Week in Bulk Shipping — Capesize rates firm, Gulf grain season outlook',
    bodyText:
      'Your weekly digest of dry bulk market moves. Capesize rates firmed 4% on China iron ore ' +
      'restocking. Gulf grain export season outlook remains strong into Q3. Click to read more ' +
      'and manage your subscription preferences.',
    bodyHtml: '<p>Your weekly digest of dry bulk market moves...</p>',
    attachments: [],
    receivedAt: T('2026-04-16T09:00:00Z'),
  },
]

export const emailMockAdapter: IEmailProvider = {
  async getUnreadMessages(): Promise<EmailMessage[]> {
    return INBOX.filter((m) => !readIds.has(m.id))
  },

  async markAsRead(messageId: string): Promise<void> {
    readIds.add(messageId)
  },

  async sendEmail(input: SendEmailInput): Promise<{ messageId: string }> {
    // Outbound is out of scope for the triage slice — the mock just acknowledges
    // so a future "reply from port call" feature has a no-op to build against.
    void input
    return { messageId: `mock-sent-${readIds.size + 1}` }
  },
}
