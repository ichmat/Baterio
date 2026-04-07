import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GanttAssignmentBar } from '@/features/planning/GanttAssignmentBar'
import type { SiteCalendarAssignment } from '@/features/planning/types'

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

describe('GanttAssignmentBar', () => {
  it('should render time label for timed assignment', () => {
    render(
      <GanttAssignmentBar
        assignment={makeAssignment()}
        siteSubject="Chantier A"
        siteStatus="Planned"
        col={2}
        span={3}
        totalColumns={70}
        isFullDuration={false}
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByText(/09h00–12h00/)).toBeInTheDocument()
  })

  it('should render "Toute la durée" for full-duration assignment', () => {
    render(
      <GanttAssignmentBar
        assignment={makeAssignment({ startDatetime: null, endDatetime: null })}
        siteSubject="Chantier A"
        siteStatus="InProgress"
        col={1}
        span={30}
        totalColumns={70}
        isFullDuration={true}
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByText('Toute la durée')).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn()

    render(
      <GanttAssignmentBar
        assignment={makeAssignment()}
        siteSubject="Chantier A"
        siteStatus="Planned"
        col={2}
        span={3}
        totalColumns={70}
        isFullDuration={false}
        onClick={onClick}
      />,
    )

    await userEvent.click(screen.getByText(/09h00–12h00/))
    expect(onClick).toHaveBeenCalled()
  })

  it('should have correct aria-label', () => {
    render(
      <GanttAssignmentBar
        assignment={makeAssignment()}
        siteSubject="Chantier A"
        siteStatus="Planned"
        col={2}
        span={3}
        totalColumns={70}
        isFullDuration={false}
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/Attribution Jean Dupont/)).toBeInTheDocument()
  })

  it('should apply Planned status color classes', () => {
    const { container } = render(
      <GanttAssignmentBar
        assignment={makeAssignment()}
        siteSubject="Chantier A"
        siteStatus="Planned"
        col={2}
        span={3}
        totalColumns={70}
        isFullDuration={false}
        onClick={vi.fn()}
      />,
    )

    const button = container.querySelector('button')
    expect(button?.className).toContain('bg-blue-100')
    expect(button?.className).toContain('border-l-blue-500')
  })
})
