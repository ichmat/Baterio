export interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  password: string
  role: 'Admin' | 'Chef' | 'Secretaire' | 'Ouvrier'
}

export interface UpdateUserRoleRequest {
  role: 'Admin' | 'Chef' | 'Secretaire' | 'Ouvrier'
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
