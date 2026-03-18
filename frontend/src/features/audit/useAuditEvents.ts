import { useQuery } from '@tanstack/react-query'
import { getAuditEvents } from './api'

export function useAuditEvents(
  entityType: string,
  entityId: number,
  page?: number,
  pageSize?: number,
) {
  return useQuery({
    queryKey: ['audit-events', entityType, entityId, page, pageSize],
    queryFn: () => getAuditEvents(entityType, entityId, page, pageSize),
    enabled: !!entityType && !!entityId,
  })
}
