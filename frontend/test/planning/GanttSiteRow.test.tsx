import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { GanttSiteRow } from '@/features/planning/GanttSiteRow'
import type { SiteCalendarEvent } from '@/features/planning/types'

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeSite(overrides: Partial<SiteCalendarEvent> = {}): SiteCalendarEvent {
  return {
    id: 1,
    reference: 'CH-2026-001',
    subject: 'Chantier Alpha',
    status: 'Planned',
    siteAddress: '1 rue Test',
    startDate: '2026-04-06',
    endDate: '2026-04-08',
    customerName: 'Dupont',
    assignments: [
      {
        id: 10,
        siteId: 1,
        userId: 100,
        userFullName: 'Jean Dupont',
        userAvatarUrl: null,
        startDatetime: '2026-04-06T09:00:00',
        endDatetime: '2026-04-06T12:00:00',
        createdAt: '2026-04-01T00:00:00',
      },
      {
        id: 11,
        siteId: 1,
        userId: 101,
        userFullName: 'Paul Martin',
        userAvatarUrl: null,
        startDatetime: null,
        endDatetime: null,
        createdAt: '2026-04-01T00:00:00',
      },
    ],
    ...overrides,
  }
}

const weekStart = new Date(2026, 3, 6) // Monday April 6

const defaultProps = {
  totalColumns: 70,
  weekStart,
  workStartHour: 8,
  workEndHour: 18,
  onAssignmentClick: vi.fn(),
  onEmptySlotClick: vi.fn(),
  onAddWorker: vi.fn(),
}

function renderRow(props: Partial<Parameters<typeof GanttSiteRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <GanttSiteRow
        site={makeSite()}
        isExpanded={false}
        onToggle={vi.fn()}
        {...defaultProps}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('GanttSiteRow', () => {
  it('should render site name in collapsed mode', () => {
    renderRow()
    expect(screen.getByText('Chantier Alpha')).toBeInTheDocument()
  })

  it('should show avatars in collapsed mode', () => {
    renderRow()
    // UserAvatarStack renders initials
    expect(screen.getByTitle('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByTitle('Paul Martin')).toBeInTheDocument()
  })

  it('should navigate to chantier on name click', async () => {
    renderRow()

    const nameBtn = screen.getByText('Chantier Alpha')
    await userEvent.click(nameBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/1')
  })

  it('should show worker rows when expanded', () => {
    renderRow({ isExpanded: true })

    // Worker names should appear in sub-rows
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Paul Martin')).toBeInTheDocument()
  })

  it('should show add button when expanded', () => {
    renderRow({ isExpanded: true })

    expect(screen.getByText('Ajouter')).toBeInTheDocument()
  })

  it('should call onAddWorker when add button clicked', async () => {
    const onAddWorker = vi.fn()
    renderRow({ isExpanded: true, onAddWorker })

    await userEvent.click(screen.getByText('Ajouter'))
    expect(onAddWorker).toHaveBeenCalledWith(1)
  })

  it('should call onToggle when chevron clicked', async () => {
    const onToggle = vi.fn()
    renderRow({ onToggle })

    await userEvent.click(screen.getByLabelText('Déplier'))
    expect(onToggle).toHaveBeenCalled()
  })
})
