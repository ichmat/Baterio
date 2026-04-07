import { useState, useCallback } from 'react'
import type { PlanningFilters } from './types'

const STORAGE_KEY = 'planning-filters'

const DEFAULT_FILTERS: PlanningFilters = {
  showSites: true,
  showReminders: true,
  siteStatuses: ['Planned', 'InProgress'],
}

function loadFilters(): PlanningFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        showSites: typeof parsed.showSites === 'boolean' ? parsed.showSites : DEFAULT_FILTERS.showSites,
        showReminders: typeof parsed.showReminders === 'boolean' ? parsed.showReminders : DEFAULT_FILTERS.showReminders,
        siteStatuses: Array.isArray(parsed.siteStatuses) ? parsed.siteStatuses : DEFAULT_FILTERS.siteStatuses,
      }
    }
  } catch {
    // corrupted localStorage, use defaults
  }
  return { ...DEFAULT_FILTERS }
}

export function usePlanningFilters() {
  const [filters, setFiltersState] = useState<PlanningFilters>(loadFilters)

  const setFilters = useCallback((update: Partial<PlanningFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...update }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { filters, setFilters }
}
