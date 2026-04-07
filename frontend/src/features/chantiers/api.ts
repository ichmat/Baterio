import { apiClient } from '@/lib/api-client'
import type {
  CreateSiteRequest, UpdateSiteRequest, SiteResponse, SiteSearchResult, SiteListFilters,
  SiteAssignment, CreateAssignmentRequest, CreateBatchAssignmentRequest,
  UpdateAssignmentRequest, AssignmentConflict, AssignmentPreset, AssignmentAdjustment,
} from './types'

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

// --- Site Assignments ---

export async function getSiteAssignments(siteId: number): Promise<SiteAssignment[]> {
  const res = await apiClient<ApiResponse<SiteAssignment[]>>(`/sites/${siteId}/assignments`)
  return res.data
}

export async function createAssignment(siteId: number, data: CreateAssignmentRequest): Promise<SiteAssignment[]> {
  const res = await apiClient<ApiResponse<SiteAssignment[]>>(`/sites/${siteId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function createBatchAssignment(siteId: number, data: CreateBatchAssignmentRequest): Promise<SiteAssignment[]> {
  const res = await apiClient<ApiResponse<SiteAssignment[]>>(`/sites/${siteId}/assignments/batch`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateAssignment(siteId: number, assignmentId: number, data: UpdateAssignmentRequest): Promise<SiteAssignment> {
  const res = await apiClient<ApiResponse<SiteAssignment>>(`/sites/${siteId}/assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deleteAssignment(siteId: number, assignmentId: number): Promise<void> {
  await apiClient<void>(`/sites/${siteId}/assignments/${assignmentId}`, { method: 'DELETE' })
}

export async function checkConflicts(siteId: number, data: { userId: number; startDatetime?: string | null; endDatetime?: string | null; excludeAssignmentId?: number }): Promise<AssignmentConflict[]> {
  const res = await apiClient<ApiResponse<AssignmentConflict[]>>(`/sites/${siteId}/assignments/check-conflicts`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function confirmAdjustments(siteId: number, adjustments: AssignmentAdjustment[]): Promise<SiteAssignment[]> {
  const res = await apiClient<ApiResponse<SiteAssignment[]>>(`/sites/${siteId}/assignments/adjust`, {
    method: 'POST',
    body: JSON.stringify(adjustments),
  })
  return res.data
}

export async function getAssignmentPresets(): Promise<AssignmentPreset[]> {
  const res = await apiClient<ApiResponse<AssignmentPreset[]>>('/sites/assignment-presets')
  return res.data
}

export async function updateAssignmentPresets(presets: AssignmentPreset[]): Promise<AssignmentPreset[]> {
  const res = await apiClient<ApiResponse<AssignmentPreset[]>>('/sites/assignment-presets', {
    method: 'PUT',
    body: JSON.stringify(presets),
  })
  return res.data
}
