import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarEventComponent } from '@/features/planning/CalendarEvent'
import type { CalendarEvent, SiteCalendarAssignment } from '@/features/planning/types'

function makeAssignment(userId: number, name: string): SiteCalendarAssignment {
  return {
    id: userId,
    siteId: 1,
    userId,
    userFullName: name,
    userAvatarUrl: null,
    startDatetime: null,
    endDatetime: null,
    createdAt: '2026-04-01',
  }
}

function makeEvent(assignments: SiteCalendarAssignment[] = []): CalendarEvent {
  return {
    id: 'site-1',
    type: 'site',
    title: 'Test Chantier',
    start: new Date(2026, 3, 6),
    end: new Date(2026, 3, 10),
    siteId: 1,
    status: 'Planned',
    customerName: 'Dupont Jean',
    siteAddress: '1 rue Test',
    assignments,
  }
}

describe('CalendarEventComponent', () => {
  it('should render event title', () => {
    const onClick = vi.fn()
    render(<CalendarEventComponent event={makeEvent()} onClick={onClick} />)

    expect(screen.getByText('Test Chantier')).toBeInTheDocument()
  })

  it('should render with 0 assignments (no avatars)', () => {
    const onClick = vi.fn()
    render(<CalendarEventComponent event={makeEvent([])} onClick={onClick} />)

    expect(screen.getByText('Test Chantier')).toBeInTheDocument()
    // No avatar elements
    expect(screen.queryByTitle(/./)).toBeNull()
  })

  it('should render with 1 assignment', () => {
    const onClick = vi.fn()
    const assignments = [makeAssignment(1, 'Martin Pierre')]
    render(<CalendarEventComponent event={makeEvent(assignments)} onClick={onClick} />)

    expect(screen.getByTitle('Martin Pierre')).toBeInTheDocument()
  })

  it('should render with 3 assignments', () => {
    const onClick = vi.fn()
    const assignments = [
      makeAssignment(1, 'Martin Pierre'),
      makeAssignment(2, 'Dupont Marie'),
      makeAssignment(3, 'Bernard Luc'),
    ]
    render(<CalendarEventComponent event={makeEvent(assignments)} onClick={onClick} />)

    expect(screen.getByTitle('Martin Pierre')).toBeInTheDocument()
    expect(screen.getByTitle('Dupont Marie')).toBeInTheDocument()
    expect(screen.getByTitle('Bernard Luc')).toBeInTheDocument()
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('should show +N for more than 3 assignments', () => {
    const onClick = vi.fn()
    const assignments = [
      makeAssignment(1, 'Martin Pierre'),
      makeAssignment(2, 'Dupont Marie'),
      makeAssignment(3, 'Bernard Luc'),
      makeAssignment(4, 'Petit Sophie'),
      makeAssignment(5, 'Moreau Jules'),
    ]
    render(<CalendarEventComponent event={makeEvent(assignments)} onClick={onClick} />)

    // 3 visible + "+2"
    expect(screen.getByTitle('Martin Pierre')).toBeInTheDocument()
    expect(screen.getByTitle('Dupont Marie')).toBeInTheDocument()
    expect(screen.getByTitle('Bernard Luc')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('should render hover card trigger with event data', () => {
    const onClick = vi.fn()
    const assignments = [makeAssignment(1, 'Martin Pierre')]
    render(<CalendarEventComponent event={makeEvent(assignments)} onClick={onClick} />)

    // The hover card trigger is a button containing the event title and worker initials
    const trigger = screen.getByText('Test Chantier')
    expect(trigger).toBeInTheDocument()
    expect(screen.getByTitle('Martin Pierre')).toBeInTheDocument()
    // Note: HoverCardContent is portal-rendered and only visible on hover,
    // which cannot be fully tested in happy-dom environment
  })
})
