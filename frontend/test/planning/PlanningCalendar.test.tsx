import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { PlanningCalendar } from '@/features/planning/PlanningCalendar'
import type { PlanningFilters, SiteCalendarEvent, QuoteReminderEvent } from '@/features/planning/types'

// Mock useMediaQuery
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false), // desktop by default
}))

import { useMediaQuery } from '@/hooks/useMediaQuery'
const mockedUseMediaQuery = vi.mocked(useMediaQuery)

// Mock the API module
vi.mock('@/features/planning/api', () => ({
  getCalendarSites: vi.fn(),
  getQuoteReminders: vi.fn(),
}))

import { getCalendarSites, getQuoteReminders } from '@/features/planning/api'

const mockedGetCalendarSites = vi.mocked(getCalendarSites)
const mockedGetQuoteReminders = vi.mocked(getQuoteReminders)

// Mock react-router navigation
const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const defaultFilters: PlanningFilters = {
  showSites: true,
  showReminders: true,
  siteStatuses: ['Planned', 'InProgress'],
}

function renderCalendar(filters: PlanningFilters = defaultFilters) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlanningCalendar filters={filters} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseMediaQuery.mockReturnValue(false) // desktop
})

describe('PlanningCalendar', () => {
  it('should show empty state when API returns empty', async () => {
    mockedGetCalendarSites.mockResolvedValue([])
    mockedGetQuoteReminders.mockResolvedValue([])

    renderCalendar()

    expect(await screen.findByText(/aucun chantier planifié/i)).toBeInTheDocument()
  })

  it('should render site events', async () => {
    const sites: SiteCalendarEvent[] = [
      {
        id: 1,
        reference: 'CH-2026-001',
        subject: 'Chantier Dupont',
        status: 'Planned',
        siteAddress: '1 rue Test',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        customerName: 'Dupont Jean',
        assignments: [],
      },
    ]
    mockedGetCalendarSites.mockResolvedValue(sites)
    mockedGetQuoteReminders.mockResolvedValue([])

    renderCalendar()

    expect(await screen.findByText('Chantier Dupont')).toBeInTheDocument()
  })

  it('should render reminder events', async () => {
    const reminders: QuoteReminderEvent[] = [
      {
        id: 1,
        reference: 'DEV-2026-001',
        subject: 'Devis terrasse',
        customerName: 'Martin Paul',
        reminderDate: new Date().toISOString().slice(0, 10),
        status: 'Sent',
      },
    ]
    mockedGetCalendarSites.mockResolvedValue([])
    mockedGetQuoteReminders.mockResolvedValue(reminders)

    renderCalendar()

    expect(await screen.findByText(/Martin Paul — Devis terrasse/)).toBeInTheDocument()
  })

  it('should navigate to chantier on site event click', async () => {
    const sites: SiteCalendarEvent[] = [
      {
        id: 42,
        reference: 'CH-2026-001',
        subject: 'Chantier Click',
        status: 'Planned',
        siteAddress: '1 rue Test',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        customerName: 'Dupont',
        assignments: [],
      },
    ]
    mockedGetCalendarSites.mockResolvedValue(sites)
    mockedGetQuoteReminders.mockResolvedValue([])

    renderCalendar()

    const event = await screen.findByText('Chantier Click')
    await userEvent.click(event)

    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/42')
  })

  it('should navigate to devis on reminder event click', async () => {
    const reminders: QuoteReminderEvent[] = [
      {
        id: 99,
        reference: 'DEV-2026-001',
        subject: 'Devis Click',
        customerName: 'Martin',
        reminderDate: new Date().toISOString().slice(0, 10),
        status: 'Draft',
      },
    ]
    mockedGetCalendarSites.mockResolvedValue([])
    mockedGetQuoteReminders.mockResolvedValue(reminders)

    renderCalendar()

    const event = await screen.findByText(/Martin — Devis Click/)
    await userEvent.click(event)

    expect(mockNavigate).toHaveBeenCalledWith('/devis/99')
  })

  it('should switch to ListDayView on mobile', async () => {
    mockedUseMediaQuery.mockReturnValue(true) // mobile

    mockedGetCalendarSites.mockResolvedValue([])
    mockedGetQuoteReminders.mockResolvedValue([])

    renderCalendar()

    // On mobile, the view switch buttons should not be visible
    expect(screen.queryByText('Semaine')).not.toBeInTheDocument()
    expect(screen.queryByText('Mois')).not.toBeInTheDocument()
  })

  it('should show view switch buttons on desktop', async () => {
    mockedGetCalendarSites.mockResolvedValue([])
    mockedGetQuoteReminders.mockResolvedValue([])

    renderCalendar()

    expect(await screen.findByText('Semaine')).toBeInTheDocument()
    expect(screen.getByText('Mois')).toBeInTheDocument()
  })
})
