import { apiClient } from '@/lib/api-client'
import type { CreateUserRequest, UpdateUserRoleRequest, UserResponse, UpdateCompanyInfoRequest, CompanyInfoResponse, SubscriptionInfoResponse, CreateCustomFieldRequest, UpdateCustomFieldRequest, CustomFieldResponse, ReorderCustomFieldsRequest } from './types'

interface ApiResponse<T> {
  data: T
}

export async function getUsers(): Promise<UserResponse[]> {
  const response = await apiClient<ApiResponse<UserResponse[]>>('/users')
  return response.data
}

export async function getUserById(id: number): Promise<UserResponse> {
  const response = await apiClient<ApiResponse<UserResponse>>(`/users/${id}`)
  return response.data
}

export async function createUser(data: CreateUserRequest): Promise<UserResponse> {
  const response = await apiClient<ApiResponse<UserResponse>>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateUserRole(id: number, data: UpdateUserRoleRequest): Promise<UserResponse> {
  const response = await apiClient<ApiResponse<UserResponse>>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function deactivateUser(id: number): Promise<void> {
  await apiClient<void>(`/users/${id}/deactivate`, { method: 'PATCH' })
}

export async function reactivateUser(id: number): Promise<void> {
  await apiClient<void>(`/users/${id}/reactivate`, { method: 'PATCH' })
}

export async function getCompanyInfo(): Promise<CompanyInfoResponse> {
  const response = await apiClient<ApiResponse<CompanyInfoResponse>>('/company')
  return response.data
}

export async function updateCompanyInfo(data: UpdateCompanyInfoRequest): Promise<CompanyInfoResponse> {
  const response = await apiClient<ApiResponse<CompanyInfoResponse>>('/company', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function getSubscriptionInfo(): Promise<SubscriptionInfoResponse> {
  const response = await apiClient<ApiResponse<SubscriptionInfoResponse>>('/company/subscription')
  return response.data
}

// Custom Fields

export async function getCustomFields(filters?: { appliesToQuotes?: boolean; appliesToSites?: boolean }): Promise<CustomFieldResponse[]> {
  const params = new URLSearchParams()
  if (filters?.appliesToQuotes !== undefined) params.set('appliesToQuotes', String(filters.appliesToQuotes))
  if (filters?.appliesToSites !== undefined) params.set('appliesToSites', String(filters.appliesToSites))
  const query = params.toString()
  const response = await apiClient<ApiResponse<CustomFieldResponse[]>>(`/custom-fields${query ? `?${query}` : ''}`)
  return response.data
}

export async function getCustomField(id: number): Promise<CustomFieldResponse> {
  const response = await apiClient<ApiResponse<CustomFieldResponse>>(`/custom-fields/${id}`)
  return response.data
}

export async function createCustomField(data: CreateCustomFieldRequest): Promise<CustomFieldResponse> {
  const response = await apiClient<ApiResponse<CustomFieldResponse>>('/custom-fields', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateCustomField(id: number, data: UpdateCustomFieldRequest): Promise<CustomFieldResponse> {
  const response = await apiClient<ApiResponse<CustomFieldResponse>>(`/custom-fields/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function deleteCustomField(id: number): Promise<void> {
  await apiClient<void>(`/custom-fields/${id}`, { method: 'DELETE' })
}

export async function reorderCustomFields(data: ReorderCustomFieldsRequest): Promise<CustomFieldResponse[]> {
  const response = await apiClient<ApiResponse<CustomFieldResponse[]>>('/custom-fields/reorder', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}
