export interface QuoteLineRequest {
  description: string
  quantity: number
  unitPriceExclTax: number
  displayOrder: number
}

export interface CreateQuoteRequest {
  customerId: number
  subject: string
  notes?: string
  priority?: string
  validityDate?: string
  estimatedDuration?: string
  siteAddress?: string
  taxRate?: number
  reminderDate?: string
  customFields?: CustomFieldEntry[] | null
  lines?: QuoteLineRequest[]
}

export interface UpdateQuoteRequest {
  subject: string
  notes?: string
  priority?: string
  validityDate?: string
  estimatedDuration?: string
  siteAddress?: string
  taxRate?: number
  reminderDate?: string | null
  customFields?: CustomFieldEntry[] | null
  lines?: QuoteLineRequest[]
}

export interface QuoteLineResponse {
  id: number
  description: string
  quantity: number
  unitPriceExclTax: number
  lineTotalExclTax: number
  displayOrder: number
}

export interface QuoteResponse {
  id: number
  reference: string
  subject: string
  status: string
  priority: string
  customerId: number
  customerName: string
  validityDate: string | null
  estimatedDuration: string | null
  siteAddress: string | null
  amountExclTax: number | null
  taxRate: number | null
  amountInclTax: number | null
  reminderDate: string | null
  customFields: CustomFieldEntry[] | null
  legalMentions: string | null
  notes: string | null
  createdBy: number
  createdByName: string
  createdAt: string
  updatedAt: string | null
  lines: QuoteLineResponse[]
}

export interface QuoteListResponse {
  id: number
  reference: string
  subject: string
  status: string
  priority: string
  customerName: string
  amountExclTax: number | null
  amountInclTax: number | null
  reminderDate: string | null
  createdAt: string
}

export interface UpdateQuoteStatusRequest {
  status: string
}

export interface QuoteSearchResult {
  id: number
  reference: string
  subject: string
  status: string
  priority: string
  customerName: string
  createdAt: string
}

export interface CustomFieldEntry {
  id: number
  label: string
  value: string | number | string[] | null
}
