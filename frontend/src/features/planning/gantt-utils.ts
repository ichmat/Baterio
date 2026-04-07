import { startOfWeek, addDays, isToday, getHours, setHours, setMinutes, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export const GANTT_WORK_START = 8
export const GANTT_WORK_END = 18

export interface GanttColumn {
  date: Date
  hour: number
  columnIndex: number
  isToday: boolean
}

/**
 * Returns the list of columns for a Gantt week grid.
 * Each column = 1 hour slot within work hours for each day of the week (Mon→Sun).
 */
export function getGanttColumns(
  weekStart: Date,
  workStartHour = GANTT_WORK_START,
  workEndHour = GANTT_WORK_END,
): GanttColumn[] {
  const columns: GanttColumn[] = []
  const hoursPerDay = workEndHour - workStartHour
  for (let day = 0; day < 7; day++) {
    const date = addDays(weekStart, day)
    const today = isToday(date)
    for (let h = 0; h < hoursPerDay; h++) {
      columns.push({
        date,
        hour: workStartHour + h,
        columnIndex: day * hoursPerDay + h,
        isToday: today,
      })
    }
  }
  return columns
}

/**
 * Computes CSS Grid column position (1-based) and span for an assignment bar.
 * Returns null if the assignment is entirely outside the visible week/work-hours range.
 *
 * For full-duration assignments (null/null), uses the parent site dates.
 */
export function getAssignmentBarPosition(
  assignment: { startDatetime: string | null; endDatetime: string | null },
  site: { startDate: string; endDate: string },
  weekStart: Date,
  workStartHour = GANTT_WORK_START,
  workEndHour = GANTT_WORK_END,
): { col: number; span: number } | null {
  const hoursPerDay = workEndHour - workStartHour
  let startDt: Date
  let endDt: Date

  if (assignment.startDatetime === null || assignment.endDatetime === null) {
    // Full-duration: use site dates, spanning full work hours each day
    startDt = setMinutes(setHours(new Date(site.startDate), workStartHour), 0)
    endDt = setMinutes(setHours(new Date(site.endDate), workEndHour), 0)
  } else {
    startDt = new Date(assignment.startDatetime)
    endDt = new Date(assignment.endDatetime)
  }

  // Clamp to visible week
  const visibleStart = setMinutes(setHours(new Date(weekStart), workStartHour), 0)
  const visibleEnd = setMinutes(setHours(addDays(weekStart, 6), workEndHour), 0)

  if (endDt <= visibleStart || startDt >= visibleEnd) return null

  const clampedStart = startDt < visibleStart ? visibleStart : startDt
  const clampedEnd = endDt > visibleEnd ? visibleEnd : endDt

  const col = dateToColumn(clampedStart, weekStart, workStartHour, workEndHour, hoursPerDay)
  const colEnd = dateToColumn(clampedEnd, weekStart, workStartHour, workEndHour, hoursPerDay)

  const span = Math.max(1, colEnd - col)
  return { col: col + 1, span } // +1 for CSS Grid 1-based
}

function dateToColumn(
  dt: Date,
  weekStart: Date,
  workStartHour: number,
  workEndHour: number,
  hoursPerDay: number,
): number {
  const dayOffset = differenceInCalendarDays(dt, weekStart)
  const clampedDay = Math.max(0, Math.min(6, dayOffset))
  const hour = getHours(dt)
  const clampedHour = Math.max(workStartHour, Math.min(workEndHour, hour))
  return clampedDay * hoursPerDay + (clampedHour - workStartHour)
}

/**
 * Converts a column index back to a date and hour (for pre-filling dialog on empty slot click).
 */
export function getEmptySlotDate(
  columnIndex: number,
  weekStart: Date,
  workStartHour = GANTT_WORK_START,
  workEndHour = GANTT_WORK_END,
): { date: Date; hour: number } {
  const hoursPerDay = workEndHour - workStartHour
  const dayIndex = Math.floor(columnIndex / hoursPerDay)
  const hourOffset = columnIndex % hoursPerDay
  const date = addDays(weekStart, dayIndex)
  return { date, hour: workStartHour + hourOffset }
}

/**
 * Returns true if the given datetime falls within work hours.
 */
export function isWithinWorkHours(
  datetime: Date,
  workStart = GANTT_WORK_START,
  workEnd = GANTT_WORK_END,
): boolean {
  const hour = getHours(datetime)
  return hour >= workStart && hour < workEnd
}

/**
 * Returns the Monday of the week containing the given date.
 */
export function getGanttWeekStart(date: Date): Date {
  return startOfWeek(date, { locale: fr, weekStartsOn: 1 })
}
