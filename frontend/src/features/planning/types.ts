export interface SiteCalendarEvent {
  id: number
  reference: string
  subject: string
  status: string
  siteAddress: string
  startDate: string
  endDate: string
  customerName: string
  assignments: SiteCalendarAssignment[]
}

export interface SiteCalendarAssignment {
  id: number
  siteId: number
  userId: number
  userFullName: string
  userAvatarUrl: string | null
  startDatetime: string | null
  endDatetime: string | null
  createdAt: string
}

export interface QuoteReminderEvent {
  id: number
  reference: string
  subject: string
  customerName: string
  reminderDate: string
  status: string
}

export interface CalendarEvent {
  id: string
  type: 'site' | 'reminder'
  title: string
  start: Date
  end: Date
  siteId?: number
  quoteId?: number
  status?: string
  customerName: string
  siteAddress?: string
  reference?: string
  assignments?: SiteCalendarAssignment[]
}

export interface PlanningFilters {
  showSites: boolean
  showReminders: boolean
  siteStatuses: string[]
}

export type PlanningViewMode = 'calendar' | 'gantt'

export interface GanttWorkerGroup {
  userId: number
  userFullName: string
  userAvatarUrl?: string | null
  assignments: SiteCalendarAssignment[]
}
