import { apiClient } from '@/lib/api-client'
import type { CreateUserRequest, UpdateUserRoleRequest, UserResponse } from './types'

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
