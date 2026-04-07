import type { CustomFieldEntry } from '../devis/types'

export interface CreateSiteRequest {
  customerId: number
  quoteId?: number
  subject: string
  siteAddress: string
  startDate?: string
  endDate?: string
  customFields?: CustomFieldEntry[] | null
  notes?: string
}

export interface SiteResponse {
  id: number
  reference: string
  subject: string
  status: string
  customerId: number
  customerName: string
  quoteId: number | null
  quoteReference: string | null
  siteAddress: string
  startDate: string | null
  endDate: string | null
  customFields: CustomFieldEntry[] | null
  notes: string | null
  createdBy: number
  createdByName: string
  createdAt: string
  updatedAt: string | null
  assignedWorkers: AssignedWorkersInfo | null
  proposedAdjustments: ProposedAdjustment[] | null
}

export interface SiteSearchResult {
  id: number
  reference: string
  subject: string
  status: string
  customerName: string
  siteAddress: string
  createdAt: string
}

export interface UpdateSiteRequest {
  subject: string
  siteAddress: string
  startDate?: string | null
  endDate?: string | null
  customFields?: CustomFieldEntry[] | null
  notes?: string | null
}

export interface SiteListFilters {
  status?: string
  search?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

// Site Assignments

export interface SiteAssignment {
  id: number
  siteId: number
  userId: number
  userFullName: string
  userAvatarUrl: string | null
  startDatetime: string | null
  endDatetime: string | null
  createdAt: string
}

export interface CreateAssignmentRequest {
  userId: number
  mode: 'full_duration' | 'date_preset' | 'range_preset' | 'free'
  date?: string
  startDate?: string
  endDate?: string
  presetStartTime?: string
  presetEndTime?: string
  startDatetime?: string
  endDatetime?: string
}

export interface CreateBatchAssignmentRequest {
  assignments: CreateAssignmentRequest[]
}

export interface UpdateAssignmentRequest {
  startDatetime?: string | null
  endDatetime?: string | null
}

export interface AssignmentConflict {
  type: 'info' | 'conflict'
  message: string
  conflictingSiteId: number | null
  conflictingSiteName: string | null
  existingStart: string | null
  existingEnd: string | null
}

export interface AssignmentPreset {
  label: string
  startTime: string
  endTime: string
  order: number
}

export interface AssignmentAdjustment {
  assignmentId: number
  newStartDatetime: string | null
  newEndDatetime: string | null
  action: 'adjust' | 'delete'
}

export interface ProposedAdjustment {
  assignmentId: number
  userFullName: string
  oldStartDatetime: string | null
  oldEndDatetime: string | null
  newStartDatetime: string | null
  newEndDatetime: string | null
  action: 'adjust' | 'delete'
}

export interface AssignedWorkersInfo {
  count: number
  names: string[]
}
