// ─── Bill of Lading renderer (pdfkit) ─────────────────────────────────────────
// Type-agnostic: reads the per-type config from BILL_TYPES[input.billType] and
// draws it. Page 1 is a bordered data grid (absolute-positioned cells, so text in
// one cell never disturbs another). Page 2 flows the Conditions-of-Carriage clauses.

import type { GenerateBillOfLadingInput, BillOfLadingParty } from '../port'
import { BILL_TYPES } from './bill-types'

const BIMCO_COPYRIGHT =
  'Copyright © 2022 BIMCO. All rights reserved. Any unauthorised copying, duplication, ' +
  'reproduction or distribution of this BIMCO SmartCon document will constitute an ' +
  "infringement of BIMCO's copyright."

const INK = '#111'
const LABEL = '#555'
const RULE = '#333'

function partyText(p: BillOfLadingParty): string {
  return p.address ? `${p.name}\n${p.address}` : p.name
}

// ─── cell helpers ─────────────────────────────────────────────────────────────
function strokeBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number): void {
  doc.save().lineWidth(0.5).strokeColor(RULE).rect(x, y, w, h).stroke().restore()
}

/** A bordered cell with a small top-left label and a value beneath it. */
function field(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  label: string, value: string, valueSize = 9
): void {
  strokeBox(doc, x, y, w, h)
  doc.font('Helvetica').fontSize(6.5).fillColor(LABEL).text(label, x + 4, y + 3, { width: w - 8 })
  if (value) {
    doc.font('Helvetica').fontSize(valueSize).fillColor(INK)
      .text(value, x + 4, y + 13, { width: w - 8 })
  }
}

// ─── page 1: the data grid ────────────────────────────────────────────────────
function renderPage1(doc: PDFKit.PDFDocument, input: GenerateBillOfLadingInput): void {
  const cfg = BILL_TYPES[input.billType]
  const L = 54
  const R = doc.page.width - 54 // 558 on LETTER

  // Masthead: agency letterhead left, form title block right.
  doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text(input.agencyName, L, 50, { width: 280 })
  doc.font('Helvetica-Bold').fontSize(17).fillColor(INK)
    .text(cfg.title, 330, 48, { width: R - 330, align: 'right' })
  doc.font('Helvetica').fontSize(8).fillColor(LABEL)
  for (const line of cfg.subtitle) {
    doc.text(line, 330, doc.y, { width: R - 330, align: 'right' })
  }
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
    .text('PAGE 1', 330, doc.y + 1, { width: R - 330, align: 'right' })
  doc.save().lineWidth(1).strokeColor(RULE).moveTo(L, 100).lineTo(R, 100).stroke().restore()

  // Grid. Column splits:
  const xL = L            // 54
  const xMid = 316        // left/right boundary
  const xQ = 437          // right-half mid (header row 3-col)
  const gy = 110

  // Row 1 — Shipper | B/L No. | Reference No.
  field(doc, xL, gy, xMid - xL, 42, 'Shipper', partyText(input.shipper))
  field(doc, xMid, gy, xQ - xMid, 42, 'Bill of Lading No.', input.blNumber)
  field(doc, xQ, gy, R - xQ, 42, 'Reference No.', input.referenceNo ?? '')

  // Row 2 — Consignee | Vessel
  field(doc, xL, gy + 42, xMid - xL, 42, 'Consignee', partyText(input.consignee))
  field(doc, xMid, gy + 42, R - xMid, 42, 'Vessel', input.vesselName)

  // Row 3 — Notify address (spans 60) | Port of Loading / Port of Discharge
  field(doc, xL, gy + 84, xMid - xL, 60, 'Notify address', partyText(input.notifyAddress))
  field(doc, xMid, gy + 84, R - xMid, 34, 'Port of Loading', input.portOfLoading)
  field(doc, xMid, gy + 118, R - xMid, 26, 'Port of Discharge', input.portOfDischarge)

  // Row 4 — Description of goods (wide) | Gross weight
  const descY = gy + 144
  field(doc, xL, descY, xQ - xL, 76, "Shipper's description of goods", input.descriptionOfGoods)
  field(doc, xQ, descY, R - xQ, 76, 'Gross weight', input.grossWeight)
  // On-deck sub-note inside the description cell.
  const onDeck = input.onDeckQuantity ?? '............'
  doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(LABEL).text(
    `(of which ${onDeck} on deck at shipper's risk; the Carrier not being responsible for ` +
      'loss or damage howsoever arising)',
    xL + 4, descY + 54, { width: xQ - xL - 8 }
  )

  // Row 5 — Freight payable / Freight advance (stacked) | SHIPPED clause block
  const fY = descY + 76
  // left-top
  strokeBox(doc, xL, fY, xMid - xL, 50)
  doc.font('Helvetica').fontSize(6.5).fillColor(LABEL).text('Freight payable as per', xL + 4, fY + 3)
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(input.freightPayableAs, xL + 4, fY + 13, { width: xMid - xL - 8 })
  doc.font('Helvetica').fontSize(6.5).fillColor(LABEL).text('Charter Party dated:', xL + 4, fY + 30)
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(input.charterPartyDate ?? '', xL + 100, fY + 28)
  // left-bottom
  strokeBox(doc, xL, fY + 50, xMid - xL, 50)
  doc.font('Helvetica-Bold').fontSize(7).fillColor(INK).text('FREIGHT ADVANCE', xL + 4, fY + 53)
  doc.font('Helvetica').fontSize(6.5).fillColor(LABEL).text('Received on account of freight:', xL + 4, fY + 64)
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(input.freightAdvanceReceived ?? '', xL + 4, fY + 76, { width: xMid - xL - 8 })
  // right — fixed SHIPPED / unknown / witness / conditions-ref boilerplate
  strokeBox(doc, xMid, fY, R - xMid, 100)
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK)
    .text('SHIPPED', xMid + 5, fY + 5, { continued: true })
  doc.font('Helvetica').fontSize(7.5)
    .text(' ' + cfg.shippedClause.replace(/^SHIPPED /, ''), { width: R - xMid - 10 })
  doc.font('Helvetica').fontSize(7).fillColor(INK).text(cfg.unknownClause, xMid + 5, doc.y + 2, { width: R - xMid - 10 })
  doc.text(cfg.witnessClause, xMid + 5, doc.y + 2, { width: R - xMid - 10 })
  doc.font('Helvetica-Bold').fontSize(6.5).text(cfg.conditionsRef, xMid + 5, doc.y + 2, { width: R - xMid - 10 })

  // Row 6 — Date shipped | Place & date of issue | Number of originals
  const iY = fY + 100
  field(doc, xL, iY, 170, 42, 'Date shipped on board', input.dateShippedOnBoard ?? '')
  field(doc, xL + 170, iY, 170, 42, 'Place and date of issue', input.placeAndDateOfIssue)
  field(doc, xL + 340, iY, R - (xL + 340), 42, 'Number of original Bills of Lading', input.numberOfOriginals)

  // Row 7 — Signature block (full width)
  const sY = iY + 42
  strokeBox(doc, xL, sY, R - xL, 72)
  doc.font('Helvetica').fontSize(9).fillColor(INK)
    .text('Signature: ', xL + 5, sY + 8, { continued: true })
    .font('Helvetica').fillColor(LABEL).text('………………………………………………………  ', { continued: true })
    .fillColor(INK).text('(Master* / Agent* / Owner* / Charterer*)')
  doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(LABEL).text('*Delete as appropriate', xL + 5, sY + 24)
  if (input.signedBy) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INK).text(`Signed as: ${input.signedBy}`, 330, sY + 24, { width: R - 335, align: 'right' })
  }
  doc.font('Helvetica').fontSize(7.5).fillColor(INK)
    .text('If signed by an Agent indicate whether for and on behalf of:', xL + 5, sY + 38)
  doc.font('Helvetica').fontSize(6.5).fillColor(LABEL).text('Agent (insert name)', xL + 5, sY + 52)
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(input.agentName ?? '', xL + 110, sY + 50, { width: R - (xL + 115) })

  // Footer (verbatim BIMCO copyright). Start + full wrapped height must clear the
  // bottom margin (738pt on LETTER) or pdfkit auto-spawns a blank page; at 5.5pt
  // this wraps to 2 lines, so y=716 ends ~730 — safe.
  doc.font('Helvetica').fontSize(5.5).fillColor(LABEL)
    .text(BIMCO_COPYRIGHT, L, 716, { width: R - L, align: 'center' })
}

// ─── page 2: conditions of carriage ───────────────────────────────────────────
function renderPage2(doc: PDFKit.PDFDocument, input: GenerateBillOfLadingInput): void {
  const cfg = BILL_TYPES[input.billType]
  const L = 54
  const R = doc.page.width - 54

  doc.addPage()
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(cfg.title, L, 50)
  doc.font('Helvetica').fontSize(8).fillColor(LABEL)
  for (const line of cfg.subtitle) doc.text(line, L, doc.y)
  doc.text('Page 2', L, doc.y)
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(cfg.conditionsTitle, L, doc.y, { width: R - L, align: 'center' })
  doc.moveDown(0.6)

  const numW = 18
  const bodyW = R - L - numW
  for (const clause of cfg.clauses) {
    const top = doc.y
    doc.font('Helvetica-Bold').fontSize(6.3).fillColor(INK).text(`(${clause.n})`, L, top + 0.5, { width: numW })
    let bodyY = top
    if (clause.heading) {
      doc.font('Helvetica-Bold').fontSize(6.3).fillColor(INK).text(clause.heading, L + numW, top, { width: bodyW })
      bodyY = doc.y
    }
    doc.font('Helvetica').fontSize(6.3).fillColor(INK)
    for (const para of clause.body.split('\n')) {
      doc.text(para, L + numW, bodyY, { width: bodyW, lineGap: 0.2 })
      bodyY = doc.y
    }
    doc.moveDown(0.35)
  }

  doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(LABEL)
    .text('For particulars of cargo, freight, destination, etc., see Page 1', L, doc.y + 3, { width: R - L, align: 'right' })
  doc.font('Helvetica').fontSize(5.5).fillColor(LABEL)
    .text(BIMCO_COPYRIGHT, L, 716, { width: R - L, align: 'center' })
}

export function renderBillOfLading(doc: PDFKit.PDFDocument, input: GenerateBillOfLadingInput): void {
  renderPage1(doc, input)
  renderPage2(doc, input)
}
