export interface ExtractedInvoice {
  vendorName: string | null
  invoiceNumber: string | null
  invoiceDate: Date | null
  dueDate: Date | null
  totalAmount: number | null   // cents
  lineItems: ExtractedLineItem[]
  rawText: string
  confidence: number  // 0-1
}

export interface ExtractedLineItem {
  description: string
  quantity: number | null
  unitPrice: number | null  // cents
  totalPrice: number | null // cents
}

export interface IOCRProvider {
  extractText(fileBuffer: Buffer, mimeType: string): Promise<string>
  extractInvoice(fileBuffer: Buffer, mimeType: string): Promise<ExtractedInvoice>
}
