import { describe, it, expect } from 'vitest'
import { formatDate } from '@/lib/format-date'

describe('formatDate', () => {
  it('formats a Date object to French locale', () => {
    const date = new Date(2026, 2, 11) // March 11, 2026
    const result = formatDate(date)
    expect(result).toBe('11/03/2026')
  })

  it('formats an ISO string to French locale', () => {
    const result = formatDate('2026-03-11T00:00:00')
    expect(result).toBe('11/03/2026')
  })
})
