import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GanttWorkerRow } from '@/features/planning/GanttWorkerRow'
import type { SiteCalendarAssignment, SiteCalendarEvent } from '@/features/planning/types'

function makeSite(): SiteCalendarEvent {
  return {
    id: 1,
    reference: 'CH-2026-001',
    subject: 'Chantier Test',
    status: 'Planned',
    siteAddress: '1 rue Test',
    startDate: '2026-04-06',
    endDate: '2026-04-10',
    customerName: 'Dupont',
    assignments: [],
  }
}

function makeAssignment(overrides: Partial<SiteCalendarAssignment> = {}): SiteCalendarAssignment {
  return {
    id: 10,
    siteId: 1,
    userId: 100,
    userFullName: 'Jean Dupont',
    userAvatarUrl: null,
    startDatetime: '2026-04-06T09:00:00',
    endDatetime: '2026-04-06T12:00:00',
    createdAt: '2026-04-01T00:00:00',
    ...overrides,
  }
}

const weekStart = new Date(2026, 3, 6)

const defaultProps = {
  worker: { userId: 100, userFullName: 'Jean Dupont', userAvatarUrl: null },
  site: makeSite(),
  totalColumns: 70,
  weekStart,
  workStartHour: 8,
  workEndHour: 18,
  onAssignmentClick: vi.fn(),
  onEmptySlotClick: vi.fn(),
}

function renderRow(assignments: SiteCalendarAssignment[] = [makeAssignment()], extraProps = {}) {
  return render(
    <GanttWorkerRow
      {...defaultProps}
      assignments={assignments}
      {...extraProps}
    />,
  )
}

describe('GanttWorkerRow', () => {
  it('should render worker name', () => {
    renderRow()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('should render assignment bar with time label', () => {
    renderRow()
    // The bar shows the time range
    expect(screen.getByText(/09h00–12h00/)).toBeInTheDocument()
  })

  it('should render full-duration assignment with distinct label', () => {
    const fullDuration = makeAssignment({ startDatetime: null, endDatetime: null })
    renderRow([fullDuration])

    expect(screen.getByText('Toute la durée')).toBeInTheDocument()
  })

  it('should call onAssignmentClick when bar is clicked', async () => {
    const onAssignmentClick = vi.fn()
    renderRow([makeAssignment()], { onAssignmentClick })

    const bar = screen.getByText(/09h00–12h00/)
    await userEvent.click(bar)

    expect(onAssignmentClick).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }))
  })

  it('should call onEmptySlotClick when empty slot is clicked', async () => {
    const onEmptySlotClick = vi.fn()
    // Assignment occupies columns for 9h-12h (cols 2-4), so other columns should be empty
    renderRow([makeAssignment()], { onEmptySlotClick })

    // Find an empty slot button (not occupied by assignment)
    const emptyButtons = screen.getAllByRole('button', { name: /ajouter attribution colonne/i })
    expect(emptyButtons.length).toBeGreaterThan(0)

    await userEvent.click(emptyButtons[0])

    expect(onEmptySlotClick).toHaveBeenCalledWith(
      1, // siteId
      expect.any(Date),
      expect.any(Number),
    )
  })
})
