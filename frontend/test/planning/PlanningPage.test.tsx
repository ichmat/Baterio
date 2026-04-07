import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { PlanningPage } from '@/pages/PlanningPage'

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}))

import { useMediaQuery } from '@/hooks/useMediaQuery'
const mockedUseMediaQuery = vi.mocked(useMediaQuery)

vi.mock('@/features/planning/api', () => ({
  getCalendarSites: vi.fn(() => Promise.resolve([])),
  getQuoteReminders: vi.fn(() => Promise.resolve([])),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => vi.fn() }
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlanningPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseMediaQuery.mockReturnValue(false)
  localStorage.removeItem('planning-view-mode')
})

describe('PlanningPage', () => {
  it('should render Planning title', () => {
    renderPage()
    expect(screen.getByText('Planning')).toBeInTheDocument()
  })

  it('should show Calendrier/Gantt toggle on desktop', () => {
    renderPage()
    expect(screen.getByText('Calendrier')).toBeInTheDocument()
    expect(screen.getByText('Gantt')).toBeInTheDocument()
  })

  it('should hide toggle on mobile', () => {
    mockedUseMediaQuery.mockReturnValue(true)
    renderPage()
    expect(screen.queryByText('Calendrier')).not.toBeInTheDocument()
    expect(screen.queryByText('Gantt')).not.toBeInTheDocument()
  })

  it('should default to calendar mode', () => {
    renderPage()
    // Calendar view shows Semaine/Mois buttons
    expect(screen.getByText('Semaine')).toBeInTheDocument()
  })

  it('should switch to Gantt view when Gantt button clicked', async () => {
    renderPage()

    await userEvent.click(screen.getByText('Gantt'))

    // Gantt view should be active - it doesn't show Semaine/Mois
    // It shows CalendarHeader without view switch
    expect(screen.queryByText('Semaine')).not.toBeInTheDocument()
  })

  it('should persist view mode in localStorage', async () => {
    renderPage()

    await userEvent.click(screen.getByText('Gantt'))

    expect(localStorage.getItem('planning-view-mode')).toBe('gantt')
  })

  it('should restore view mode from localStorage', () => {
    localStorage.setItem('planning-view-mode', 'gantt')
    renderPage()

    // Should be in Gantt mode - no Semaine/Mois buttons
    expect(screen.queryByText('Semaine')).not.toBeInTheDocument()
  })
})
