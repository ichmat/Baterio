import { apiClient } from '@/lib/api-client'
import type { CustomerResponse, CreateCustomerRequest, UpdateCustomerRequest } from './types'

interface ApiResponse<T> {
  data: T
}

export async function getCustomers(): Promise<CustomerResponse[]> {
  const response = await apiClient<ApiResponse<CustomerResponse[]>>('/customers')
  return response.data
}

export async function getCustomerById(id: number): Promise<CustomerResponse> {
  const response = await apiClient<ApiResponse<CustomerResponse>>(`/customers/${id}`)
  return response.data
}

export async function createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
  const response = await apiClient<ApiResponse<CustomerResponse>>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateCustomer(id: number, data: UpdateCustomerRequest): Promise<CustomerResponse> {
  const response = await apiClient<ApiResponse<CustomerResponse>>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}
