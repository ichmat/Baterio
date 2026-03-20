import { useQuery } from '@tanstack/react-query'
import { getAuditEvents } from './api'

export function useAuditEvents(
  entityType: string,
  entityId: number,
  page?: number,
  pageSize?: number,
  action?: string,
) {
  return useQuery({
    queryKey: ['audit-events', entityType, entityId, page, pageSize, action],
    queryFn: () => getAuditEvents(entityType, entityId, page, pageSize, action),
    enabled: !!entityType && !!entityId,
  })
}
