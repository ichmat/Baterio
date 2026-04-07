import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeekView } from '@/features/planning/WeekView'
import type { CalendarEvent } from '@/features/planning/types'

function makeSiteEvent(id: string, start: Date, end: Date, title = `Chantier ${id}`): CalendarEvent {
  return {
    id: `site-${id}`,
    type: 'site',
    title,
    start,
    end,
    customerName: 'Dupont',
    status: 'Planned',
    siteAddress: '1 rue Test',
    assignments: [],
  }
}

function makeReminderEvent(id: string, date: Date): CalendarEvent {
  return {
    id: `reminder-${id}`,
    type: 'reminder',
    title: `Rappel ${id}`,
    start: date,
    end: date,
    customerName: 'Martin',
  }
}

describe('WeekView', () => {
  const onEventClick = vi.fn()
  const currentDate = new Date(2026, 3, 6) // Monday April 6

  it('should render 7 day headers', () => {
    render(<WeekView currentDate={currentDate} events={[]} onEventClick={onEventClick} />)

    expect(screen.getByText('lun.')).toBeInTheDocument()
    expect(screen.getByText('dim.')).toBeInTheDocument()
  })

  it('should render site events in lanes', () => {
    const events = [
      makeSiteEvent('1', new Date(2026, 3, 6), new Date(2026, 3, 8), 'Chantier Alpha'),
      makeSiteEvent('2', new Date(2026, 3, 7), new Date(2026, 3, 10), 'Chantier Beta'),
    ]

    render(<WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    expect(screen.getByText('Chantier Alpha')).toBeInTheDocument()
    expect(screen.getByText('Chantier Beta')).toBeInTheDocument()
  })

  it('should render reminder events separately', () => {
    const events = [makeReminderEvent('1', new Date(2026, 3, 7))]

    render(<WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    expect(screen.getByText('Rappel 1')).toBeInTheDocument()
  })

  it('should render multi-day events spanning multiple columns', () => {
    const events = [makeSiteEvent('1', new Date(2026, 3, 6), new Date(2026, 3, 12), 'Full Week')]

    const { container } = render(
      <WeekView currentDate={currentDate} events={events} onEventClick={onEventClick} />,
    )

    const eventDiv = container.querySelector('[style*="grid-column"]')
    expect(eventDiv).not.toBeNull()
    expect(eventDiv?.getAttribute('style')).toContain('span 7')
  })
})
