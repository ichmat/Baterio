export interface AuditEventResponse {
  id: number
  entityType: string
  entityId: number
  userId: number
  userFullName: string
  action: string
  payload: string | null
  createdAt: string
}

export interface AuditEventsPage {
  data: AuditEventResponse[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
