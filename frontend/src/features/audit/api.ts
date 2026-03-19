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
): Promise<AuditEventsPage> {
  const response = await apiClient<ApiResponse<AuditEventsPage>>(
    `/audit-events?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}&page=${page}&pageSize=${pageSize}`,
  )
  return response.data
}
