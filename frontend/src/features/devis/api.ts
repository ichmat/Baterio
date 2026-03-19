import { apiClient } from '@/lib/api-client'
import type {
  CreateQuoteRequest,
  UpdateQuoteRequest,
  UpdateQuoteStatusRequest,
  QuoteResponse,
  QuoteListResponse,
} from './types'

interface ApiResponse<T> {
  data: T
}

export interface QuotesPage {
  data: QuoteListResponse[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export async function getQuotes(page = 1, pageSize = 20): Promise<QuotesPage> {
  const response = await apiClient<ApiResponse<QuotesPage>>(
    `/quotes?page=${page}&pageSize=${pageSize}`,
  )
  return response.data
}

export async function getQuoteById(id: number): Promise<QuoteResponse> {
  const response = await apiClient<ApiResponse<QuoteResponse>>(`/quotes/${id}`)
  return response.data
}

export async function createQuote(data: CreateQuoteRequest): Promise<QuoteResponse> {
  const response = await apiClient<ApiResponse<QuoteResponse>>('/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateQuote(id: number, data: UpdateQuoteRequest): Promise<QuoteResponse> {
  const response = await apiClient<ApiResponse<QuoteResponse>>(`/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.data
}

export async function updateQuoteStatus(
  id: number,
  data: UpdateQuoteStatusRequest,
): Promise<QuoteResponse> {
  const response = await apiClient<ApiResponse<QuoteResponse>>(`/quotes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return response.data
}
