import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlanningFilters } from '@/features/planning/usePlanningFilters'

beforeEach(() => {
  localStorage.clear()
})

describe('usePlanningFilters', () => {
  it('should return default filters when localStorage is empty', () => {
    const { result } = renderHook(() => usePlanningFilters())

    expect(result.current.filters).toEqual({
      showSites: true,
      showReminders: true,
      siteStatuses: ['Planned', 'InProgress'],
    })
  })

  it('should persist filters to localStorage', () => {
    const { result } = renderHook(() => usePlanningFilters())

    act(() => {
      result.current.setFilters({ showSites: false })
    })

    expect(result.current.filters.showSites).toBe(false)

    const stored = JSON.parse(localStorage.getItem('planning-filters')!)
    expect(stored.showSites).toBe(false)
    expect(stored.showReminders).toBe(true) // unchanged
  })

  it('should read filters from localStorage on init', () => {
    localStorage.setItem(
      'planning-filters',
      JSON.stringify({
        showSites: false,
        showReminders: true,
        siteStatuses: ['Completed'],
      }),
    )

    const { result } = renderHook(() => usePlanningFilters())

    expect(result.current.filters).toEqual({
      showSites: false,
      showReminders: true,
      siteStatuses: ['Completed'],
    })
  })

  it('should update siteStatuses', () => {
    const { result } = renderHook(() => usePlanningFilters())

    act(() => {
      result.current.setFilters({ siteStatuses: ['Planned', 'InProgress', 'Paused'] })
    })

    expect(result.current.filters.siteStatuses).toEqual(['Planned', 'InProgress', 'Paused'])
  })

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('planning-filters', 'not-valid-json')

    const { result } = renderHook(() => usePlanningFilters())

    // Should fall back to defaults
    expect(result.current.filters).toEqual({
      showSites: true,
      showReminders: true,
      siteStatuses: ['Planned', 'InProgress'],
    })
  })
})
