import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListDayView } from '@/features/planning/ListDayView'
import type { CalendarEvent } from '@/features/planning/types'

function makeSiteEvent(
  id: string,
  start: Date,
  end: Date,
  title = `Chantier ${id}`,
): CalendarEvent {
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
    reference: 'DEV-2026-001',
  }
}

describe('ListDayView', () => {
  const onEventClick = vi.fn()
  const currentDate = new Date(2026, 3, 6) // Monday April 6

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show all 7 day headers even when empty', () => {
    render(<ListDayView currentDate={currentDate} events={[]} onEventClick={onEventClick} />)

    expect(screen.getByText(/lundi 6 avril/i)).toBeInTheDocument()
    expect(screen.getByText(/dimanche 12 avril/i)).toBeInTheDocument()
  })

  it('should show "Aucun événement" for empty days', () => {
    render(<ListDayView currentDate={currentDate} events={[]} onEventClick={onEventClick} />)

    const emptyMessages = screen.getAllByText('Aucun événement')
    expect(emptyMessages.length).toBe(7)
  })

  it('should show "Jour X/N" indicator for multi-day events', () => {
    const events = [makeSiteEvent('1', new Date(2026, 3, 6), new Date(2026, 3, 8), 'Chantier Multi')]

    render(<ListDayView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    expect(screen.getByText('Jour 1/3')).toBeInTheDocument()
    expect(screen.getByText('Jour 2/3')).toBeInTheDocument()
    expect(screen.getByText('Jour 3/3')).toBeInTheDocument()
  })

  it('should render reminder events with customer name', () => {
    const events = [makeReminderEvent('1', new Date(2026, 3, 7))]

    render(<ListDayView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    expect(screen.getByText('Martin')).toBeInTheDocument()
  })

  it('should call onEventClick when clicking an event', async () => {
    const events = [makeSiteEvent('1', new Date(2026, 3, 6), new Date(2026, 3, 6), 'Click Me')]

    render(<ListDayView currentDate={currentDate} events={events} onEventClick={onEventClick} />)

    await userEvent.click(screen.getByText('Click Me'))
    expect(onEventClick).toHaveBeenCalledOnce()
  })
})
