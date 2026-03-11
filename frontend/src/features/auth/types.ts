export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserInfo
}

export interface UserInfo {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: 'Admin' | 'Chef' | 'Secretaire' | 'Ouvrier'
  tenantId: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}
