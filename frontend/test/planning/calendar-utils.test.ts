import { describe, it, expect } from 'vitest'
import {
  getWeekDays,
  getMonthGrid,
  layoutEvents,
  getDayPosition,
  getEventDayIndicator,
} from '@/features/planning/calendar-utils'
import type { CalendarEvent } from '@/features/planning/types'

function makeEvent(
  id: string,
  startStr: string,
  endStr: string,
  type: 'site' | 'reminder' = 'site',
): CalendarEvent {
  return {
    id,
    type,
    title: `Event ${id}`,
    start: new Date(startStr),
    end: new Date(endStr),
    color: '',
    borderColor: '',
    customerName: 'Test',
  }
}

describe('getWeekDays', () => {
  it('should return 7 days starting from Monday (FR locale)', () => {
    // 2026-04-07 is a Tuesday
    const days = getWeekDays(new Date('2026-04-07'))
    expect(days).toHaveLength(7)
    // Monday
    expect(days[0].getDay()).toBe(1) // Monday
    expect(days[6].getDay()).toBe(0) // Sunday
  })

  it('should return correct week for a Monday', () => {
    const days = getWeekDays(new Date(2026, 3, 6)) // Monday April 6 (local time)
    expect(days[0].getDate()).toBe(6)
    expect(days[0].getMonth()).toBe(3) // April
    expect(days[6].getDate()).toBe(12)
  })

  it('should return correct week for a Sunday', () => {
    const days = getWeekDays(new Date(2026, 3, 12)) // Sunday April 12 (local time)
    expect(days[0].getDate()).toBe(6) // Monday
    expect(days[6].getDate()).toBe(12) // Sunday
  })
})

describe('getMonthGrid', () => {
  it('should return 6 rows of 7 days', () => {
    const grid = getMonthGrid(new Date('2026-04-15'))
    expect(grid).toHaveLength(6)
    for (const row of grid) {
      expect(row).toHaveLength(7)
    }
  })

  it('should start on a Monday', () => {
    const grid = getMonthGrid(new Date('2026-04-15'))
    expect(grid[0][0].getDay()).toBe(1) // Monday
  })

  it('should end on a Sunday', () => {
    const grid = getMonthGrid(new Date('2026-04-15'))
    const lastRow = grid[grid.length - 1]
    expect(lastRow[6].getDay()).toBe(0) // Sunday
  })
})

describe('layoutEvents', () => {
  const weekStart = new Date('2026-04-06') // Monday
  const weekEnd = new Date('2026-04-12') // Sunday

  it('should return empty array for 0 events', () => {
    const lanes = layoutEvents([], weekStart, weekEnd)
    expect(lanes).toHaveLength(0)
  })

  it('should place a single event in one lane', () => {
    const events = [makeEvent('1', '2026-04-07', '2026-04-09')]
    const lanes = layoutEvents(events, weekStart, weekEnd)
    expect(lanes).toHaveLength(1)
    expect(lanes[0]).toHaveLength(1)
  })

  it('should place non-overlapping events in the same lane', () => {
    const events = [
      makeEvent('1', '2026-04-06', '2026-04-07'),
      makeEvent('2', '2026-04-09', '2026-04-10'),
    ]
    const lanes = layoutEvents(events, weekStart, weekEnd)
    expect(lanes).toHaveLength(1)
    expect(lanes[0]).toHaveLength(2)
  })

  it('should place overlapping events in separate lanes', () => {
    const events = [
      makeEvent('1', '2026-04-06', '2026-04-09'),
      makeEvent('2', '2026-04-08', '2026-04-11'),
    ]
    const lanes = layoutEvents(events, weekStart, weekEnd)
    expect(lanes).toHaveLength(2)
  })

  it('should handle 5 overlapping events', () => {
    const events = [
      makeEvent('1', '2026-04-06', '2026-04-12'),
      makeEvent('2', '2026-04-06', '2026-04-12'),
      makeEvent('3', '2026-04-06', '2026-04-12'),
      makeEvent('4', '2026-04-06', '2026-04-12'),
      makeEvent('5', '2026-04-06', '2026-04-12'),
    ]
    const lanes = layoutEvents(events, weekStart, weekEnd)
    expect(lanes).toHaveLength(5)
  })

  it('should exclude events outside the week range', () => {
    const events = [
      makeEvent('1', '2026-04-06', '2026-04-08'),
      makeEvent('outside', '2026-04-13', '2026-04-15'), // next week
    ]
    const lanes = layoutEvents(events, weekStart, weekEnd)
    expect(lanes).toHaveLength(1)
    expect(lanes[0][0].id).toBe('1')
  })

  it('stress: should handle 50 events efficiently', () => {
    const events: CalendarEvent[] = []
    for (let i = 0; i < 50; i++) {
      const dayOffset = i % 7
      events.push(
        makeEvent(
          `${i}`,
          `2026-04-${String(6 + dayOffset).padStart(2, '0')}`,
          `2026-04-${String(6 + dayOffset + 2).padStart(2, '0')}`,
        ),
      )
    }

    const start = performance.now()
    const lanes = layoutEvents(events, weekStart, weekEnd)
    const elapsed = performance.now() - start

    expect(lanes.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('getDayPosition', () => {
  const weekStart = new Date('2026-04-06') // Monday
  const weekEnd = new Date('2026-04-12') // Sunday

  it('should return correct col and span for an event within the week', () => {
    const event = makeEvent('1', '2026-04-07', '2026-04-09') // Tue-Thu
    const pos = getDayPosition(event, weekStart, weekEnd)
    expect(pos.col).toBe(2) // 2nd column (Tuesday)
    expect(pos.span).toBe(3) // 3 days
  })

  it('should clamp event starting before weekStart', () => {
    const event = makeEvent('1', '2026-04-03', '2026-04-08') // Fri-Wed (starts before week)
    const pos = getDayPosition(event, weekStart, weekEnd)
    expect(pos.col).toBe(1) // starts at Monday
    expect(pos.span).toBe(3) // Mon-Wed
  })

  it('should clamp event ending after weekEnd', () => {
    const event = makeEvent('1', '2026-04-10', '2026-04-15') // Fri-Wed (ends after week)
    const pos = getDayPosition(event, weekStart, weekEnd)
    expect(pos.col).toBe(5) // Friday
    expect(pos.span).toBe(3) // Fri-Sun
  })

  it('should handle cross-week event (Fri->Mon)', () => {
    // Event spans from Friday of this week to Monday of next week
    const event = makeEvent('1', '2026-04-10', '2026-04-13')
    const pos = getDayPosition(event, weekStart, weekEnd)
    expect(pos.col).toBe(5) // Friday
    expect(pos.span).toBe(3) // Fri-Sun (clamped at weekEnd)
  })
})

describe('getEventDayIndicator', () => {
  it('should return Jour 1/4 for first day of a 4-day event', () => {
    const event = makeEvent('1', '2026-04-06', '2026-04-09')
    const result = getEventDayIndicator(event, new Date('2026-04-06'))
    expect(result).toEqual({ day: 1, total: 4 })
  })

  it('should return Jour 4/4 for last day of a 4-day event', () => {
    const event = makeEvent('1', '2026-04-06', '2026-04-09')
    const result = getEventDayIndicator(event, new Date('2026-04-09'))
    expect(result).toEqual({ day: 4, total: 4 })
  })

  it('should return Jour 2/5 for a mid-day event', () => {
    const event = makeEvent('1', '2026-04-06', '2026-04-10')
    const result = getEventDayIndicator(event, new Date('2026-04-07'))
    expect(result).toEqual({ day: 2, total: 5 })
  })

  it('should return Jour 1/1 for a single-day event', () => {
    const event = makeEvent('1', '2026-04-06', '2026-04-06')
    const result = getEventDayIndicator(event, new Date('2026-04-06'))
    expect(result).toEqual({ day: 1, total: 1 })
  })
})
