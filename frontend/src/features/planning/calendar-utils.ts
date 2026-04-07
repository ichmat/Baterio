import {
  startOfWeek,
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  compareAsc,
  max,
  min,
  eachDayOfInterval,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CalendarEvent } from './types'

/**
 * Returns the 7 days (Mon→Sun) of the week containing the given date.
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { locale: fr, weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/**
 * Returns a 6×7 grid of dates for the month view (Mon→Sun).
 */
export function getMonthGrid(date: Date): Date[][] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { locale: fr, weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { locale: fr, weekStartsOn: 1 })

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const rows: Date[][] = []
  for (let i = 0; i < allDays.length; i += 7) {
    rows.push(allDays.slice(i, i + 7))
  }

  // Pad to 6 rows if fewer
  while (rows.length < 6) {
    const lastDay = rows[rows.length - 1][6]
    const nextWeek = Array.from({ length: 7 }, (_, i) => addDays(lastDay, i + 1))
    rows.push(nextWeek)
  }

  return rows
}

/**
 * Row stacking algorithm for multi-day event positioning.
 * Returns lanes where lane index = CSS grid-row.
 */
export function layoutEvents(
  events: CalendarEvent[],
  weekStart: Date,
  weekEnd: Date,
): CalendarEvent[][] {
  const relevant = events
    .filter((e) => e.start <= weekEnd && e.end >= weekStart)
    .sort(
      (a, b) =>
        compareAsc(a.start, b.start) ||
        differenceInDays(b.end, b.start) - differenceInDays(a.end, a.start),
    )

  const lanes: CalendarEvent[][] = []
  for (const event of relevant) {
    const lane = lanes.find(
      (l) => !l.some((e) => e.start <= event.end && e.end >= event.start),
    )
    if (lane) lane.push(event)
    else lanes.push([event])
  }
  return lanes
}

/**
 * Returns CSS Grid position (col, span) for an event within a week.
 */
export function getDayPosition(
  event: CalendarEvent,
  weekStart: Date,
  weekEnd: Date,
): { col: number; span: number } {
  const clampedStart = max([event.start, weekStart])
  const clampedEnd = min([event.end, weekEnd])
  const col = differenceInDays(clampedStart, weekStart) + 1
  const span = differenceInDays(clampedEnd, clampedStart) + 1
  return { col, span }
}

/**
 * Returns "Jour X/N" indicator for multi-day events in mobile list view.
 */
export function getEventDayIndicator(
  event: CalendarEvent,
  currentDate: Date,
): { day: number; total: number } {
  const total = differenceInDays(event.end, event.start) + 1
  const day = differenceInDays(currentDate, event.start) + 1
  return { day, total }
}
