import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

// Mock api-client to avoid real network calls
vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(() => null),
}))

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('renders the login page when not authenticated', () => {
    render(<App />)
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('shows Batério title on login page', () => {
    render(<App />)
    expect(screen.getByText('Batério')).toBeInTheDocument()
  })
})
