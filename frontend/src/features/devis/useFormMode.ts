import { useState } from 'react'
import type { FormMode } from './FormModeSelector'

const STORAGE_KEY = 'devis-form-mode'

export function useFormMode() {
  const [mode, setMode] = useState<FormMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'rapide' || stored === 'libre' || stored === 'complet') {
      return stored
    }
    return 'libre'
  })

  const updateMode = (newMode: FormMode) => {
    setMode(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }

  return { mode, updateMode }
}
