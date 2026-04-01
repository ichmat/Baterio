import { apiClient } from '@/lib/api-client'
import type { CreateSiteRequest, UpdateSiteRequest, SiteResponse, SiteSearchResult, SiteListFilters } from './types'

interface ApiResponse<T> {
  data: T
}

export interface SitesPage {
  data: SiteResponse[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export async function getSiteById(id: number): Promise<SiteResponse> {
  const response = await apiClient<ApiResponse<SiteResponse>>(`/sites/${id}`)
  return response.data
}

export async function createSite(data: CreateSiteRequest): Promise<SiteResponse> {
  const response = await apiClient<ApiResponse<SiteResponse>>('/sites', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function deleteSite(id: number): Promise<void> {
  await apiClient<void>(`/sites/${id}`, { method: 'DELETE' })
}

export async function getSitesByCustomer(customerId: number): Promise<SiteSearchResult[]> {
  const res = await apiClient<ApiResponse<SiteSearchResult[]>>(
    `/sites/by-customer/${customerId}`,
  )
  return res.data
}

export async function searchSites(query: string, limit = 10): Promise<SiteSearchResult[]> {
  const res = await apiClient<ApiResponse<SiteSearchResult[]>>(
    `/sites/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  )
  return res.data
}

export async function updateSite(id: number, data: UpdateSiteRequest): Promise<SiteResponse> {
  const response = await apiClient<ApiResponse<SiteResponse>>(`/sites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateSiteStatus(id: number, status: string): Promise<SiteResponse> {
  const response = await apiClient<ApiResponse<SiteResponse>>(`/sites/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return response.data
}

export async function getSites(page: number, pageSize: number, filters?: SiteListFilters): Promise<SitesPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.sortBy) params.set('sortBy', filters.sortBy)
  if (filters?.sortDirection) params.set('sortDirection', filters.sortDirection)

  const response = await apiClient<ApiResponse<SitesPage>>(`/sites?${params}`)
  return response.data
}
