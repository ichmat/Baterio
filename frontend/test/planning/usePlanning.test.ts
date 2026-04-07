import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useCalendarSites, useQuoteReminders } from '@/features/planning/usePlanning'

// Mock the API module
vi.mock('@/features/planning/api', () => ({
  getCalendarSites: vi.fn(),
  getQuoteReminders: vi.fn(),
}))

import { getCalendarSites, getQuoteReminders } from '@/features/planning/api'

const mockedGetCalendarSites = vi.mocked(getCalendarSites)
const mockedGetQuoteReminders = vi.mocked(getQuoteReminders)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCalendarSites', () => {
  it('should use correct queryKey', async () => {
    mockedGetCalendarSites.mockResolvedValue([])

    const { result } = renderHook(() => useCalendarSites('2026-04-01', '2026-04-30'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetCalendarSites).toHaveBeenCalledWith('2026-04-01', '2026-04-30')
  })

  it('should not fetch when start is undefined', () => {
    const { result } = renderHook(() => useCalendarSites(undefined, '2026-04-30'), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockedGetCalendarSites).not.toHaveBeenCalled()
  })

  it('should not fetch when end is undefined', () => {
    const { result } = renderHook(() => useCalendarSites('2026-04-01', undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockedGetCalendarSites).not.toHaveBeenCalled()
  })

  it('should refetch when dates change', async () => {
    mockedGetCalendarSites.mockResolvedValue([])

    const { result, rerender } = renderHook(
      ({ start, end }: { start: string; end: string }) => useCalendarSites(start, end),
      {
        wrapper: createWrapper(),
        initialProps: { start: '2026-04-01', end: '2026-04-30' },
      },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ start: '2026-05-01', end: '2026-05-31' })

    await waitFor(() =>
      expect(mockedGetCalendarSites).toHaveBeenCalledWith('2026-05-01', '2026-05-31'),
    )
  })
})

describe('useQuoteReminders', () => {
  it('should use correct queryKey', async () => {
    mockedGetQuoteReminders.mockResolvedValue([])

    const { result } = renderHook(() => useQuoteReminders('2026-04-01', '2026-04-30'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetQuoteReminders).toHaveBeenCalledWith('2026-04-01', '2026-04-30')
  })

  it('should not fetch when dates are undefined', () => {
    const { result } = renderHook(() => useQuoteReminders(undefined, undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockedGetQuoteReminders).not.toHaveBeenCalled()
  })
})
