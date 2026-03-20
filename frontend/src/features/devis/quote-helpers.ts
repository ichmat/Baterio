import type { QuoteResponse, UpdateQuoteRequest } from './types'

export function buildUpdateRequest(
  quote: QuoteResponse,
  overrides: Partial<UpdateQuoteRequest>,
): UpdateQuoteRequest {
  return {
    subject: quote.subject,
    notes: quote.notes ?? undefined,
    priority: quote.priority,
    validityDate: quote.validityDate ?? undefined,
    estimatedDuration: quote.estimatedDuration ?? undefined,
    siteAddress: quote.siteAddress ?? undefined,
    taxRate: quote.taxRate ?? undefined,
    reminderDate: quote.reminderDate ?? undefined,
    customFields: quote.customFields ?? undefined,
    lines: quote.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPriceExclTax: l.unitPriceExclTax,
      displayOrder: l.displayOrder,
    })),
    ...overrides,
  }
}
