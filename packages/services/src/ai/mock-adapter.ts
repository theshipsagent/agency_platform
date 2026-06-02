// Mock adapter for the AI port.
//
// A deterministic, offline classifier — NO LLM call. It parses an email's
// subject+body with regex/keyword heuristics and returns the same
// ClassifyEmailResult shape a real LLM adapter would. This lets the whole
// inbox-triage UX be built and tested with zero API cost or network, and makes
// the output reproducible (a real LLM would drift run-to-run). Production swaps
// in an LLM adapter via PROVIDER_LLM; the route + UI never change.
//
// Determinism note: no Date.now() / Math.random() — same input always yields
// the same classification, so snapshot tests and demos are stable.

import { DocumentType } from '@shipops/shared'
import type {
  IAIProvider,
  ClassifyEmailResult,
  SuggestedAction,
} from './port'

// ─── Extractors ───────────────────────────────────────────────────────────────

// Port call numbers in this system look like PC-2026-0005. We also tolerate the
// office-prefixed variant (NOL-2026-00001) that the seed data uses.
const PORT_CALL_RE = /\b(?:PC|NOL|HOU|MOB)-\d{4}-\d{4,5}\b/i

function extractPortCallNumber(text: string): string | null {
  const m = text.match(PORT_CALL_RE)
  return m ? m[0].toUpperCase() : null
}

// Money figures → integer cents (honours the project-wide "money is always
// cents" rule). Keyed by a best-guess label so the triage UI can show
// "primaryAmount: $14,250.00" without re-parsing. Matches USD 14,250.00 / $3,800 etc.
const MONEY_RE = /(?:USD|US\$|\$)\s?([\d,]+(?:\.\d{1,2})?)/gi

function extractFigures(text: string): Record<string, number> {
  const figures: Record<string, number> = {}
  let i = 0
  for (const match of text.matchAll(MONEY_RE)) {
    const raw = match[1]
    if (raw === undefined) continue
    const dollars = parseFloat(raw.replace(/,/g, ''))
    if (Number.isFinite(dollars)) {
      const label = i === 0 ? 'primaryAmount' : `amount${i + 1}`
      figures[label] = Math.round(dollars * 100) // → cents
      i++
    }
  }
  return figures
}

// Lightweight ETA sniff. A real LLM would parse natural-language dates robustly;
// the mock just looks for an "ETA ... <DD Month>" or "<Month DD>" cue and builds
// a Date in the fixture year. Returns null when it can't be confident — better an
// honest null than a hallucinated date (guessing destroys operator trust).
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

function extractEta(text: string): Date | null {
  if (!/\beta\b/i.test(text)) return null
  // "18 April" or "April 18"
  const dm = text.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i)
  const md = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i)
  let day: number | null = null
  let month: number | null = null
  if (dm && dm[1] && dm[2]) { day = parseInt(dm[1], 10); month = MONTHS.indexOf(dm[2].toLowerCase()) }
  else if (md && md[1] && md[2]) { month = MONTHS.indexOf(md[1].toLowerCase()); day = parseInt(md[2], 10) }
  if (day === null || month === null || month < 0 || Number.isNaN(day)) return null
  // Year is fixed to the fixture epoch (2026); a real adapter would infer it.
  return new Date(Date.UTC(2026, month, day, 0, 0, 0))
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION POINT (William) — the maritime classification knowledge.
//
// This table is the heart of the classifier: "given the words in this email,
// what kind of document/event is it about?" It's ordered — FIRST match wins —
// so the most decisive, specific cues belong at the top. Your 30 years of
// reading these emails is exactly the judgment that should shape this list:
// which abbreviations are unambiguous, which words are noise, what an agency
// operator would actually file this under.
//
// Each entry is [pattern, DocumentType]. Edit freely; the rest of the adapter
// adapts automatically.
const DOC_TYPE_KEYWORDS: Array<readonly [RegExp, DocumentType]> = [
  [/\bNOR\b|notice of readiness/i, DocumentType.NOR],
  [/\bSOF\b|statement of facts/i, DocumentType.SOF],
  [/invoice|billing|\bremit\b|net\s?30/i, DocumentType.INVOICE],
  [/bill of lading|\bB\/?L\b/i, DocumentType.BILL_OF_LADING],
  [/manifest/i, DocumentType.MANIFEST],
  [/survey|draft survey|outturn/i, DocumentType.SURVEY_REPORT],
  [/customs|entry summary/i, DocumentType.CUSTOMS_ENTRY],
  [/charter party|\bC\/?P\b|fixture recap/i, DocumentType.CHARTER_PARTY],
] as const

// "Is this email about a port call at all?" — distinguishes operational mail
// from newsletters/marketing. Negative cues veto; a port-call number or a
// vessel reference ("MV ...") is strong positive evidence.
const NEGATIVE_RE = /unsubscribe|newsletter|digest|subscription|manage your preferences|marketing/i
const VESSEL_RE = /\bM[VT]\s+[A-Z]/

// ─── Classifier ─────────────────────────────────────────────────────────────

function classify(subject: string, body: string): ClassifyEmailResult {
  const text = `${subject}\n${body}`

  const portCallNumber = extractPortCallNumber(text)
  const docTypeHit = DOC_TYPE_KEYWORDS.find(([re]) => re.test(text))
  const suggestedDocumentType = docTypeHit ? docTypeHit[1] : null
  const extractedFigures = extractFigures(text)
  const extractedEta = extractEta(text)

  const hasVessel = VESSEL_RE.test(text)
  const isNewsletter = NEGATIVE_RE.test(text)

  // Decision: port-call-related unless it reads as bulk marketing. A concrete
  // PC number or vessel reference is decisive positive signal; an extracted ETA
  // or a recognised document type also counts (an ETA update with the vessel
  // named bare — no "MV" prefix — is still operational mail).
  const isPortCallRelated =
    !isNewsletter &&
    (portCallNumber !== null ||
      hasVessel ||
      suggestedDocumentType !== null ||
      extractedEta !== null)

  // Confidence reflects how much hard evidence we found. A PC number is the
  // strongest single signal; vessel + doc type stack; a clean newsletter veto
  // is itself high-confidence (we're sure it's NOT a port call).
  let confidence: number
  if (!isPortCallRelated) {
    confidence = isNewsletter ? 0.95 : 0.6
  } else {
    confidence = 0.5
    if (portCallNumber) confidence += 0.35
    if (hasVessel) confidence += 0.1
    if (suggestedDocumentType) confidence += 0.05
    if (extractedEta) confidence += 0.05
    confidence = Math.min(confidence, 0.99)
  }

  const summary = buildSummary({
    isPortCallRelated,
    portCallNumber,
    suggestedDocumentType,
    hasVessel,
  })

  return {
    isPortCallRelated,
    portCallNumber,
    suggestedDocumentType,
    extractedEta,
    extractedFigures,
    summary,
    confidence: Math.round(confidence * 100) / 100,
  }
}

function buildSummary(p: {
  isPortCallRelated: boolean
  portCallNumber: string | null
  suggestedDocumentType: DocumentType | null
  hasVessel: boolean
}): string {
  if (!p.isPortCallRelated) return 'Not port-call related — likely newsletter or general correspondence.'
  const parts: string[] = []
  if (p.suggestedDocumentType) parts.push(`Looks like a ${p.suggestedDocumentType.replace(/_/g, ' ').toLowerCase()}`)
  else parts.push('Operational message')
  if (p.portCallNumber) parts.push(`for ${p.portCallNumber}`)
  else if (p.hasVessel) parts.push('referencing a vessel but no explicit port-call number')
  return `${parts.join(' ')}.`
}

export const aiMockAdapter: IAIProvider = {
  async classifyEmail(subject: string, body: string): Promise<ClassifyEmailResult> {
    return classify(subject, body)
  },

  async suggestActions(portCallContext: string): Promise<SuggestedAction[]> {
    // Minimal canned suggestions — out of scope for the triage slice but stubbed
    // so a future "next best action" panel has something to build against.
    void portCallContext
    return [
      { action: 'review_documents', description: 'Review outstanding documents for this port call.', priority: 'medium' },
    ]
  },

  async extractDataFromText(text: string, schema: Record<string, string>): Promise<Record<string, unknown>> {
    // Generic extraction stub — returns figures it can find, ignores the schema
    // shape for now. Real adapter would prompt the LLM with the schema.
    void schema
    return { figures: extractFigures(text) }
  },
}
