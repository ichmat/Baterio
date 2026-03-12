import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SubscriptionInfo } from '@/features/admin/SubscriptionInfo'
import * as api from '@/features/admin/api'
import type { SubscriptionInfoResponse } from '@/features/admin/types'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockSubscription: SubscriptionInfoResponse = {
  plan: 'MVP Gratuit',
  activeUsers: 2,
  maxUsers: 10,
  tenantName: 'Baterio Dev',
  createdAt: '2026-01-01T00:00:00Z',
}

const mockSubscriptionUnlimited: SubscriptionInfoResponse = {
  plan: 'MVP Gratuit',
  activeUsers: 5,
  maxUsers: null,
  tenantName: 'Baterio Dev',
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SubscriptionInfo', () => {
  it('renders subscription info', async () => {
    vi.mocked(api.getSubscriptionInfo).mockResolvedValue(mockSubscription)
    render(<SubscriptionInfo />)

    await waitFor(() => {
      expect(screen.getByText('Baterio Dev')).toBeInTheDocument()
    })

    expect(screen.getByText('MVP Gratuit')).toBeInTheDocument()
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
  })

  it('shows "Illimité" when maxUsers is null', async () => {
    vi.mocked(api.getSubscriptionInfo).mockResolvedValue(mockSubscriptionUnlimited)
    render(<SubscriptionInfo />)

    await waitFor(() => {
      expect(screen.getByText('5 / Illimité')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    vi.mocked(api.getSubscriptionInfo).mockImplementation(() => new Promise(() => {}))
    render(<SubscriptionInfo />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
})
