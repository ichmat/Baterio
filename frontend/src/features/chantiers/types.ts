import type { CustomFieldEntry } from '../devis/types'

export interface CreateSiteRequest {
  customerId: number
  quoteId?: number
  subject: string
  siteAddress: string
  startDate?: string
  endDate?: string
  customFields?: CustomFieldEntry[] | null
  notes?: string
}

export interface SiteResponse {
  id: number
  reference: string
  subject: string
  status: string
  customerId: number
  customerName: string
  quoteId: number | null
  quoteReference: string | null
  siteAddress: string
  startDate: string | null
  endDate: string | null
  customFields: CustomFieldEntry[] | null
  notes: string | null
  createdBy: number
  createdByName: string
  createdAt: string
  updatedAt: string | null
}

export interface SiteSearchResult {
  id: number
  reference: string
  subject: string
  status: string
  customerName: string
  siteAddress: string
  createdAt: string
}

export interface UpdateSiteRequest {
  subject: string
  siteAddress: string
  startDate?: string | null
  endDate?: string | null
  customFields?: CustomFieldEntry[] | null
  notes?: string | null
}

export interface SiteListFilters {
  status?: string
  search?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}
