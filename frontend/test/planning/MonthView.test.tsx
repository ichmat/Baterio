import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonthView } from '@/features/planning/MonthView'
import type { CalendarEvent } from '@/features/planning/types'

function makeSiteEvent(id: string, start: Date, end: Date): CalendarEvent {
  return {
    id: `site-${id}`,
    type: 'site',
    title: `Chantier ${id}`,
    start,
    end,
    customerName: 'Dupont',
    status: 'Planned',
    siteAddress: '1 rue Test',
    assignments: [],
  }
}

describe('MonthView', () => {
  const onEventClick = vi.fn()
  const currentDate = new Date(2026, 3, 15) // April 15

  it('should render day-of-week headers', () => {
    render(<MonthView currentDate={currentDate} events={[]} onEventClick={onEventClick} />)

    expect(screen.getByText('lun')).toBeInTheDocument()
    expect(screen.getByText('dim')).toBeInTheDocument()
  })

  it('should render a 6-row grid', () => {
    const { container } = render(
      <MonthView currentDate={currentDate} events={[]} onEventClick={onEventClick} />,
    )

    const gridRows = container.querySelectorAll('.grid.grid-cols-7')
    expect(gridRows.length).toBe(7) // header + 6 weeks
  })

  it('should render events in correct day cells', () => {
    const events = [makeSiteEvent('1', new Date(2026, 3, 10), new Date(2026, 3, 10))]

    render(<MonthView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    expect(screen.getByText('Chantier 1')).toBeInTheDocument()
  })

  it('should show +N overflow for more than 3 events', () => {
    const day = new Date(2026, 3, 10)
    const events = [
      makeSiteEvent('1', day, day),
      makeSiteEvent('2', day, day),
      makeSiteEvent('3', day, day),
      makeSiteEvent('4', day, day),
      makeSiteEvent('5', day, day),
    ]

    render(<MonthView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
