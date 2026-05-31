// PDFKit-based adapter for FDA + SOF generation.
//
// Named "mock" by convention (matching the other 6 services), but PDF rendering
// is local — there is no real "remote" provider to mock. The same renderer will
// be the production renderer; only the *template* will evolve over time.
//
// Both methods return a Buffer suitable for HTTP response (Content-Type:
// application/pdf). Layouts are intentionally minimal placeholders — final
// FDA / SOF templates need real maritime-domain input (see TODOs in
// renderFda / renderSof).

import PDFDocument from 'pdfkit'
import { centsToDisplayOrDash } from '@shipops/shared/utils'
import type {
  IPDFProvider,
  GenerateFDAInput,
  GenerateSOFInput,
} from './port'

// ─── PDFKit collect-to-buffer helper ──────────────────────────────────────────
// PDFKit emits chunks via Node stream events. We accumulate them and resolve
// with a single Buffer once the document ends.
function renderToBuffer(
  draw: (doc: PDFKit.PDFDocument) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 54, bottom: 54, left: 54, right: 54 },
      info: { Producer: 'ShipOps', Creator: 'ShipOps' },
    })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      draw(doc)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
// Money formatting delegates to @shipops/shared/utils.centsToDisplayOrDash.
// Date formatting is kept local — FDAs use ISO yyyy-MM-dd for clarity, which
// differs from the human-facing 'dd MMM yyyy' format in shared/utils.

function fmtDate(d: Date | string | null | undefined): string {
  if (d === null || d === undefined) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (d === null || d === undefined) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}Z`
}

// ─── FDA renderer ─────────────────────────────────────────────────────────────
// TODO(maritime-domain): final FDA layout / field labels / column structure /
// vendor categorization needs William's input. This is a working placeholder.
function renderFda(doc: PDFKit.PDFDocument, input: GenerateFDAInput): void {
  const { portCall, vessel, principal, da, agencyName } = input

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text(agencyName, { align: 'left' })
  doc.moveDown(0.3)
  doc.fontSize(14).text('FINAL DISBURSEMENT ACCOUNT', { align: 'left' })
  doc.moveDown(0.2)
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#666')
    .text(`File: ${portCall.portCallNumber}    Phase: ${portCall.phase}`)
  doc.fillColor('black').moveDown(1)

  // Three-column meta block: vessel | port call | principal
  const colTop = doc.y
  const colWidth = (doc.page.width - 108) / 3
  const col1X = 54
  const col2X = 54 + colWidth + 8
  const col3X = 54 + (colWidth + 8) * 2

  const drawCol = (
    x: number,
    title: string,
    rows: ReadonlyArray<readonly [string, string]>
  ) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000')
      .text(title, x, colTop, { width: colWidth })
    doc.moveDown(0.4)
    doc.font('Helvetica').fontSize(9).fillColor('#222')
    for (const [k, v] of rows) {
      doc.text(`${k}: ${v}`, x, doc.y, { width: colWidth })
    }
  }

  drawCol(col1X, 'VESSEL', [
    ['Name', vessel.name],
    ['IMO', vessel.imoNumber],
    ['Flag', vessel.flagState],
    ['Type', vessel.vesselType],
    ['DWT', vessel.dwt ? `${vessel.dwt.toLocaleString()} mt` : '—'],
  ])

  drawCol(col2X, 'PORT CALL', [
    ['Number', portCall.portCallNumber],
    ['Type', portCall.portCallType],
    ['Arrived', fmtDateTime(portCall.arrivedAt)],
    ['Sailed', fmtDateTime(portCall.sailedAt)],
  ])

  drawCol(col3X, 'PRINCIPAL', [
    ['Name', principal.name],
    ['Type', principal.type],
    ['Country', principal.country ?? '—'],
    ['Contact', principal.contactName ?? '—'],
  ])

  doc.moveDown(2)

  // Expense table
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
    .text('Disbursement Detail', 54)
  doc.moveDown(0.5)

  const tableTop = doc.y
  const colDescX = 54
  const colCategoryX = 280
  const colProformaX = 390
  const colActualX = 470
  const tableRight = doc.page.width - 54

  // Header row
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
  doc.text('Description', colDescX, tableTop)
  doc.text('Category', colCategoryX, tableTop)
  doc.text('Proforma', colProformaX, tableTop, { width: 70, align: 'right' })
  doc.text('Actual', colActualX, tableTop, { width: 70, align: 'right' })
  doc.moveTo(colDescX, tableTop + 13).lineTo(tableRight, tableTop + 13)
    .strokeColor('#888').stroke()
  doc.moveDown(1)

  // Body rows
  doc.font('Helvetica').fontSize(9).fillColor('#222')
  for (const expense of da.expenses) {
    const rowY = doc.y
    doc.text(expense.description, colDescX, rowY, { width: 220 })
    doc.text(expense.category, colCategoryX, rowY, { width: 100 })
    doc.text(centsToDisplayOrDash(expense.proformaAmount), colProformaX, rowY, {
      width: 70,
      align: 'right',
    })
    doc.text(centsToDisplayOrDash(expense.actualAmount), colActualX, rowY, {
      width: 70,
      align: 'right',
    })
    // Advance past the tallest cell in this row (description wraps; others don't)
    const descHeight = doc.heightOfString(expense.description, { width: 220 })
    doc.y = rowY + Math.max(descHeight, 12) + 2
  }

  // Totals
  doc.moveDown(0.5)
  doc.moveTo(colDescX, doc.y).lineTo(tableRight, doc.y).strokeColor('#888').stroke()
  doc.moveDown(0.4)

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
  const writeTotalRow = (label: string, value: string) => {
    const y = doc.y
    doc.text(label, colCategoryX, y, { width: 130 })
    doc.text(value, colActualX, y, { width: 70, align: 'right' })
    doc.moveDown(0.3)
  }

  writeTotalRow('Proforma Total', centsToDisplayOrDash(da.proformaTotal))
  writeTotalRow('Actual Total', centsToDisplayOrDash(da.actualTotal))
  writeTotalRow('Agency Fee', centsToDisplayOrDash(da.agencyFee))
  writeTotalRow('Grand Total', centsToDisplayOrDash(da.grandTotal))
  writeTotalRow('Funded', centsToDisplayOrDash(da.fundedAmount))
  doc.fillColor(da.isShortFunded ? '#b91c1c' : '#15803d')
  writeTotalRow('Balance', centsToDisplayOrDash(da.balance))
  doc.fillColor('#000')

  // Footer
  doc.moveDown(2)
  doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#666')
    .text(
      `Generated by ${agencyName} via ShipOps on ${fmtDate(new Date())}. ` +
        `This document is a working draft until accepted by the principal.`,
      54,
      doc.y,
      { align: 'center', width: doc.page.width - 108 }
    )
}

// ─── SOF renderer ─────────────────────────────────────────────────────────────
// TODO(maritime-domain): a real SOF has standard event types (NOR Tendered,
// NOR Accepted, Pilot On Board, All Fast, Hose Connected, Loading Commenced,
// Loading Completed, etc.), per-event remarks, and signature blocks for
// captain + agent. This is a working placeholder using whatever events are
// in the timeline.
function renderSof(doc: PDFKit.PDFDocument, input: GenerateSOFInput): void {
  const { portCall, vessel, events, agencyName } = input

  doc.fontSize(18).font('Helvetica-Bold').text(agencyName)
  doc.moveDown(0.3)
  doc.fontSize(14).text('STATEMENT OF FACTS')
  doc.moveDown(0.2)
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#666')
    .text(
      `Vessel: ${vessel.name} (IMO ${vessel.imoNumber})    ` +
        `File: ${portCall.portCallNumber}`
    )
  doc.fillColor('black').moveDown(1.5)

  // Events table
  const tableTop = doc.y
  const tableRight = doc.page.width - 54
  doc.font('Helvetica-Bold').fontSize(9)
  doc.text('Timestamp (UTC)', 54, tableTop, { width: 130 })
  doc.text('Event', 190, tableTop, { width: 160 })
  doc.text('Source', 354, tableTop, { width: 60 })
  doc.text('Notes', 420, tableTop, { width: tableRight - 420 })
  doc.moveTo(54, tableTop + 13).lineTo(tableRight, tableTop + 13)
    .strokeColor('#888').stroke()
  doc.moveDown(1)

  doc.font('Helvetica').fontSize(9).fillColor('#222')
  if (events.length === 0) {
    doc.fillColor('#666').text('No timeline events recorded.', 54)
  } else {
    for (const event of events) {
      const rowY = doc.y
      const label = event.customLabel ?? event.eventType
      doc.text(fmtDateTime(event.occurredAt), 54, rowY, { width: 130 })
      doc.text(label, 190, rowY, { width: 160 })
      doc.text(event.source, 354, rowY, { width: 60 })
      doc.text(event.notes ?? '', 420, rowY, { width: tableRight - 420 })
      const notesHeight = doc.heightOfString(event.notes ?? '', {
        width: tableRight - 420,
      })
      const labelHeight = doc.heightOfString(label, { width: 160 })
      doc.y = rowY + Math.max(notesHeight, labelHeight, 12) + 2
    }
  }

  doc.moveDown(2)
  doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#666')
    .text(
      `Generated by ${agencyName} via ShipOps on ${fmtDate(new Date())}.`,
      54,
      doc.y,
      { align: 'center', width: doc.page.width - 108 }
    )
}

// ─── Adapter export ───────────────────────────────────────────────────────────
export const pdfMockAdapter: IPDFProvider = {
  async generateFDA(input: GenerateFDAInput): Promise<Buffer> {
    return renderToBuffer((doc) => renderFda(doc, input))
  },

  async generateSOF(input: GenerateSOFInput): Promise<Buffer> {
    return renderToBuffer((doc) => renderSof(doc, input))
  },
}
