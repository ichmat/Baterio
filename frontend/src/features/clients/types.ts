export interface CustomerResponse {
  id: number
  lastName: string
  firstName: string
  telephone: string | null
  email: string | null
  address: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CreateCustomerRequest {
  lastName: string
  firstName: string
  telephone?: string
  email?: string
  address?: string
}

export interface UpdateCustomerRequest {
  lastName: string
  firstName: string
  telephone?: string
  email?: string
  address?: string
}
