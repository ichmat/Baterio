import { describe, it, expect } from 'vitest'
import {
  getGanttColumns,
  getAssignmentBarPosition,
  getEmptySlotDate,
  isWithinWorkHours,
  getGanttWeekStart,
  GANTT_WORK_START,
  GANTT_WORK_END,
} from '@/features/planning/gantt-utils'

describe('getGanttColumns', () => {
  it('should return 7 days × 10 hours = 70 columns with default work hours', () => {
    const weekStart = new Date(2026, 3, 6) // Monday April 6
    const columns = getGanttColumns(weekStart)
    expect(columns).toHaveLength(70)
  })

  it('should have correct first column (Monday 8h)', () => {
    const weekStart = new Date(2026, 3, 6)
    const columns = getGanttColumns(weekStart)
    expect(columns[0].hour).toBe(8)
    expect(columns[0].columnIndex).toBe(0)
    expect(columns[0].date.getDay()).toBe(1) // Monday
  })

  it('should have correct last column (Sunday 17h)', () => {
    const weekStart = new Date(2026, 3, 6)
    const columns = getGanttColumns(weekStart)
    const last = columns[69]
    expect(last.hour).toBe(17)
    expect(last.columnIndex).toBe(69)
    expect(last.date.getDay()).toBe(0) // Sunday
  })

  it('should respect custom work hours', () => {
    const weekStart = new Date(2026, 3, 6)
    const columns = getGanttColumns(weekStart, 9, 17)
    // 7 days × 8 hours = 56 columns
    expect(columns).toHaveLength(56)
    expect(columns[0].hour).toBe(9)
  })

  it('should mark today columns correctly', () => {
    const today = new Date()
    const weekStart = getGanttWeekStart(today)
    const columns = getGanttColumns(weekStart)
    const todayColumns = columns.filter((c) => c.isToday)
    expect(todayColumns).toHaveLength(10) // 10 work hours
  })
})

describe('getAssignmentBarPosition', () => {
  const weekStart = new Date(2026, 3, 6) // Monday April 6

  it('should return correct position for assignment within visible range', () => {
    const assignment = {
      startDatetime: '2026-04-06T09:00:00',
      endDatetime: '2026-04-06T12:00:00',
    }
    const site = { startDate: '2026-04-06', endDate: '2026-04-10' }
    const result = getAssignmentBarPosition(assignment, site, weekStart)

    expect(result).not.toBeNull()
    // Monday 9h = column index 1 → CSS col 2
    expect(result!.col).toBe(2)
    // 9h to 12h = 3 hours span
    expect(result!.span).toBe(3)
  })

  it('should return null for assignment entirely outside visible week', () => {
    const assignment = {
      startDatetime: '2026-03-30T09:00:00',
      endDatetime: '2026-03-30T12:00:00',
    }
    const site = { startDate: '2026-03-30', endDate: '2026-03-30' }
    const result = getAssignmentBarPosition(assignment, site, weekStart)
    expect(result).toBeNull()
  })

  it('should handle full-duration assignment (null/null) using site dates', () => {
    const assignment = { startDatetime: null, endDatetime: null }
    const site = { startDate: '2026-04-07', endDate: '2026-04-09' } // Tue-Thu
    const result = getAssignmentBarPosition(assignment, site, weekStart)

    expect(result).not.toBeNull()
    // Tuesday 8h = day 1 * 10 + 0 = col index 10 → CSS col 11
    expect(result!.col).toBe(11)
    // Tue 8h to Thu 18h = 3 days × 10h = 30 hours
    expect(result!.span).toBe(30)
  })

  it('should clamp cross-week assignment to visible range', () => {
    const assignment = {
      startDatetime: '2026-04-04T09:00:00', // Saturday before
      endDatetime: '2026-04-08T14:00:00', // Wednesday
    }
    const site = { startDate: '2026-04-04', endDate: '2026-04-08' }
    const result = getAssignmentBarPosition(assignment, site, weekStart)

    expect(result).not.toBeNull()
    // Clamped start = Monday 8h = col 1
    expect(result!.col).toBe(1)
  })

  it('should handle assignment spanning multiple days', () => {
    const assignment = {
      startDatetime: '2026-04-06T10:00:00', // Monday 10h
      endDatetime: '2026-04-07T15:00:00', // Tuesday 15h
    }
    const site = { startDate: '2026-04-06', endDate: '2026-04-10' }
    const result = getAssignmentBarPosition(assignment, site, weekStart)

    expect(result).not.toBeNull()
    // Monday 10h = index 2, Tuesday 15h = index 10+7=17, span = 17-2 = 15
    expect(result!.col).toBe(3) // index 2 + 1
    expect(result!.span).toBe(15)
  })
})

describe('getEmptySlotDate', () => {
  const weekStart = new Date(2026, 3, 6) // Monday April 6

  it('should convert column 0 to Monday 8h', () => {
    const result = getEmptySlotDate(0, weekStart)
    expect(result.date.getDate()).toBe(6)
    expect(result.hour).toBe(8)
  })

  it('should convert column 10 to Tuesday 8h', () => {
    const result = getEmptySlotDate(10, weekStart)
    expect(result.date.getDate()).toBe(7) // Tuesday
    expect(result.hour).toBe(8)
  })

  it('should convert column 15 to Tuesday 13h', () => {
    const result = getEmptySlotDate(15, weekStart)
    expect(result.date.getDate()).toBe(7) // Tuesday
    expect(result.hour).toBe(13) // 8 + 5
  })

  it('should respect custom work hours', () => {
    const result = getEmptySlotDate(0, weekStart, 9, 17)
    expect(result.hour).toBe(9)
  })
})

describe('isWithinWorkHours', () => {
  it('should return true for datetime within work hours', () => {
    expect(isWithinWorkHours(new Date(2026, 3, 6, 10, 0))).toBe(true)
    expect(isWithinWorkHours(new Date(2026, 3, 6, 8, 0))).toBe(true)
    expect(isWithinWorkHours(new Date(2026, 3, 6, 17, 59))).toBe(true)
  })

  it('should return false for datetime outside work hours', () => {
    expect(isWithinWorkHours(new Date(2026, 3, 6, 7, 0))).toBe(false)
    expect(isWithinWorkHours(new Date(2026, 3, 6, 18, 0))).toBe(false)
    expect(isWithinWorkHours(new Date(2026, 3, 6, 22, 0))).toBe(false)
  })

  it('should respect custom work hours', () => {
    expect(isWithinWorkHours(new Date(2026, 3, 6, 7, 0), 7, 16)).toBe(true)
    expect(isWithinWorkHours(new Date(2026, 3, 6, 16, 0), 7, 16)).toBe(false)
  })
})

describe('getGanttWeekStart', () => {
  it('should return Monday for any day of the week', () => {
    // Wednesday April 8
    const result = getGanttWeekStart(new Date(2026, 3, 8))
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getDate()).toBe(6)
  })

  it('should return same day if already Monday', () => {
    const monday = new Date(2026, 3, 6)
    const result = getGanttWeekStart(monday)
    expect(result.getDate()).toBe(6)
  })
})
