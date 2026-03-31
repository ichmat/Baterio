import { apiClient } from '@/lib/api-client'
import type { CreateSiteRequest, SiteResponse, SiteSearchResult } from './types'

interface ApiResponse<T> {
  data: T
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
