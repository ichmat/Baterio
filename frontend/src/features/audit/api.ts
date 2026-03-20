import { apiClient } from '@/lib/api-client'
import type { AuditEventsPage } from './types'

interface ApiResponse<T> {
  data: T
}

export async function getAuditEvents(
  entityType: string,
  entityId: number,
  page = 1,
  pageSize = 20,
  action?: string,
): Promise<AuditEventsPage> {
  let url = `/audit-events?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}&page=${page}&pageSize=${pageSize}`
  if (action) url += `&action=${encodeURIComponent(action)}`
  const response = await apiClient<ApiResponse<AuditEventsPage>>(url)
  return response.data
}
