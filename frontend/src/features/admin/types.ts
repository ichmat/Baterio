export interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  password: string
  role: 'Chef' | 'Secretaire' | 'Ouvrier'
}

export interface UpdateUserRoleRequest {
  role: 'Chef' | 'Secretaire' | 'Ouvrier'
}

export interface UserResponse {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
}

export interface UpdateCompanyInfoRequest {
  companyName?: string
  address?: string
  siret?: string
  vatNumber?: string
  legalForm?: string
  insurancePolicyNumber?: string
  insuranceProvider?: string
  insuranceCoverage?: string
  defaultPaymentTerms?: string
}

export interface CompanyInfoResponse {
  id: number
  companyName?: string
  address?: string
  siret?: string
  vatNumber?: string
  legalForm?: string
  insurancePolicyNumber?: string
  insuranceProvider?: string
  insuranceCoverage?: string
  defaultPaymentTerms?: string
  createdAt: string
  updatedAt?: string
}

export interface SubscriptionInfoResponse {
  plan: string
  activeUsers: number
  maxUsers: number | null
  tenantName: string
  createdAt: string
}

// Custom Fields

export type FieldType = 'Text' | 'Number' | 'SingleChoice' | 'MultipleChoice' | 'Date'
export type ObligationLevel = 'Never' | 'RequiredAtCreation' | 'RequiredForSiteConversion'

export interface CreateCustomFieldRequest {
  label: string
  fieldType: FieldType
  options?: string
  obligationLevel: ObligationLevel
  appliesToQuotes: boolean
  appliesToSites: boolean
}

export interface UpdateCustomFieldRequest {
  label?: string
  options?: string
  obligationLevel?: ObligationLevel
  appliesToQuotes?: boolean
  appliesToSites?: boolean
}

export interface CustomFieldResponse {
  id: number
  label: string
  fieldType: FieldType
  options?: string
  obligationLevel: ObligationLevel
  appliesToQuotes: boolean
  appliesToSites: boolean
  displayOrder: number
  createdAt: string
  updatedAt?: string
}

export interface ReorderCustomFieldsRequest {
  fieldIds: number[]
}
