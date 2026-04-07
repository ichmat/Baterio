import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { GanttView } from '@/features/planning/GanttView'
import type { PlanningFilters, SiteCalendarEvent } from '@/features/planning/types'

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}))

import { useMediaQuery } from '@/hooks/useMediaQuery'
const mockedUseMediaQuery = vi.mocked(useMediaQuery)

vi.mock('@/features/planning/api', () => ({
  getCalendarSites: vi.fn(),
  getQuoteReminders: vi.fn(),
}))

import { getCalendarSites } from '@/features/planning/api'
const mockedGetCalendarSites = vi.mocked(getCalendarSites)

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => vi.fn() }
})

const defaultFilters: PlanningFilters = {
  showSites: true,
  showReminders: true,
  siteStatuses: ['Planned', 'InProgress'],
}

function renderGantt(filters: PlanningFilters = defaultFilters) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GanttView filters={filters} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function makeSite(overrides: Partial<SiteCalendarEvent> = {}): SiteCalendarEvent {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: 1,
    reference: 'CH-2026-001',
    subject: 'Chantier Test',
    status: 'Planned',
    siteAddress: '1 rue Test',
    startDate: today,
    endDate: today,
    customerName: 'Dupont',
    assignments: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseMediaQuery.mockReturnValue(false)
})

describe('GanttView', () => {
  it('should show empty state when no sites', async () => {
    mockedGetCalendarSites.mockResolvedValue([])

    renderGantt()

    expect(await screen.findByText(/aucun chantier planifié/i)).toBeInTheDocument()
  })

  it('should render sites in Gantt grid', async () => {
    mockedGetCalendarSites.mockResolvedValue([makeSite()])

    renderGantt()

    expect(await screen.findByText('Chantier Test')).toBeInTheDocument()
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('should filter sites by status', async () => {
    mockedGetCalendarSites.mockResolvedValue([
      makeSite({ id: 1, subject: 'Site Planned', status: 'Planned' }),
      makeSite({ id: 2, subject: 'Site Completed', status: 'Completed' }),
    ])

    renderGantt({ ...defaultFilters, siteStatuses: ['Planned'] })

    expect(await screen.findByText('Site Planned')).toBeInTheDocument()
    expect(screen.queryByText('Site Completed')).not.toBeInTheDocument()
  })

  it('should show empty state when showSites is false', async () => {
    mockedGetCalendarSites.mockResolvedValue([makeSite()])

    renderGantt({ ...defaultFilters, showSites: false })

    expect(await screen.findByText(/aucun chantier planifié/i)).toBeInTheDocument()
  })

  it('should show error state when API fails', async () => {
    mockedGetCalendarSites.mockRejectedValue(new Error('Network error'))

    renderGantt()

    expect(await screen.findByText(/erreur lors du chargement/i)).toBeInTheDocument()
  })

  it('should show mobile view when on small screen', async () => {
    mockedUseMediaQuery.mockReturnValue(true)
    mockedGetCalendarSites.mockResolvedValue([makeSite()])

    renderGantt()

    // Mobile view shows day headers, not the grid role
    expect(await screen.findByText('Chantier Test')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('should show CalendarHeader with navigation', async () => {
    mockedGetCalendarSites.mockResolvedValue([])

    renderGantt()

    expect(await screen.findByText("Aujourd'hui")).toBeInTheDocument()
    expect(screen.getByLabelText('Période précédente')).toBeInTheDocument()
    expect(screen.getByLabelText('Période suivante')).toBeInTheDocument()
  })
})
