import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReminderEvent } from '@/features/planning/ReminderEvent'
import type { CalendarEvent } from '@/features/planning/types'

function makeReminder(title = 'Martin — Devis terrasse'): CalendarEvent {
  return {
    id: 'reminder-1',
    type: 'reminder',
    title,
    start: new Date('2026-04-07'),
    end: new Date('2026-04-07'),
    customerName: 'Martin',
    reference: 'DEV-2026-001',
  }
}

describe('ReminderEvent', () => {
  it('should render title in normal mode', () => {
    const onClick = vi.fn()
    render(<ReminderEvent event={makeReminder()} onClick={onClick} />)

    expect(screen.getByText('Martin — Devis terrasse')).toBeInTheDocument()
  })

  it('should render title in compact mode', () => {
    const onClick = vi.fn()
    render(<ReminderEvent event={makeReminder()} onClick={onClick} compact />)

    expect(screen.getByText('Martin — Devis terrasse')).toBeInTheDocument()
  })

  it('should have amber background styling', () => {
    const onClick = vi.fn()
    const { container } = render(<ReminderEvent event={makeReminder()} onClick={onClick} />)

    const button = container.querySelector('button')
    expect(button?.className).toContain('bg-amber-50')
    expect(button?.className).toContain('border-l-amber-500')
  })

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<ReminderEvent event={makeReminder()} onClick={onClick} />)

    await userEvent.click(screen.getByText('Martin — Devis terrasse'))
    expect(onClick).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'reminder-1' }))
  })
})
