import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { GanttMobileView } from '@/features/planning/GanttMobileView'
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
    subject: 'Chantier Mobile',
    status: 'Planned',
    siteAddress: '1 rue Test',
    startDate: '2026-04-06',
    endDate: '2026-04-10',
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
    ],
    ...overrides,
  }
}

describe('GanttMobileView', () => {
  const currentDate = new Date(2026, 3, 6) // Monday April 6
  const onAssignmentClick = vi.fn()
  const onAddWorker = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render day headers for the week', () => {
    render(
      <MemoryRouter>
        <GanttMobileView
          currentDate={currentDate}
          sites={[]}
          onAssignmentClick={onAssignmentClick}
          onAddWorker={onAddWorker}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/lundi 6 avril/i)).toBeInTheDocument()
  })

  it('should show "Aucun chantier" for empty days', () => {
    render(
      <MemoryRouter>
        <GanttMobileView
          currentDate={currentDate}
          sites={[]}
          onAssignmentClick={onAssignmentClick}
          onAddWorker={onAddWorker}
        />
      </MemoryRouter>,
    )

    const emptyTexts = screen.getAllByText('Aucun chantier')
    expect(emptyTexts.length).toBe(7)
  })

  it('should render site name and navigate on click', async () => {
    render(
      <MemoryRouter>
        <GanttMobileView
          currentDate={currentDate}
          sites={[makeSite()]}
          onAssignmentClick={onAssignmentClick}
          onAddWorker={onAddWorker}
        />
      </MemoryRouter>,
    )

    const siteBtn = screen.getAllByText('Chantier Mobile')[0]
    await userEvent.click(siteBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/1')
  })

  it('should render worker assignments with time slots', () => {
    render(
      <MemoryRouter>
        <GanttMobileView
          currentDate={currentDate}
          sites={[makeSite()]}
          onAssignmentClick={onAssignmentClick}
          onAddWorker={onAddWorker}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Jean Dupont')[0]).toBeInTheDocument()
    expect(screen.getAllByText('09:00–12:00')[0]).toBeInTheDocument()
  })

  it('should call onAssignmentClick when assignment tapped', async () => {
    render(
      <MemoryRouter>
        <GanttMobileView
          currentDate={currentDate}
          sites={[makeSite()]}
          onAssignmentClick={onAssignmentClick}
          onAddWorker={onAddWorker}
        />
      </MemoryRouter>,
    )

    const assignmentBtn = screen.getAllByText('Jean Dupont')[0]
    await userEvent.click(assignmentBtn)

    expect(onAssignmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10 }),
      1,
    )
  })

  it('should call onAddWorker when + button clicked', async () => {
    render(
      <MemoryRouter>
        <GanttMobileView
          currentDate={currentDate}
          sites={[makeSite()]}
          onAssignmentClick={onAssignmentClick}
          onAddWorker={onAddWorker}
        />
      </MemoryRouter>,
    )

    const addBtns = screen.getAllByText('Ajouter')
    await userEvent.click(addBtns[0])

    expect(onAddWorker).toHaveBeenCalledWith(1)
  })
})
