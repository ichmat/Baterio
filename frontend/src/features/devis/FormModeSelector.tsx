import { useCallback, type KeyboardEvent } from 'react'
import { Zap, FileText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FormMode = 'rapide' | 'libre' | 'complet'

interface FormModeSelectorProps {
  mode: FormMode
  onModeChange: (mode: FormMode) => void
}

const MODES = [
  { value: 'rapide' as const, label: 'Rapide', description: 'Obligatoires seuls', icon: Zap },
  { value: 'libre' as const, label: 'Libre', description: 'Tous les champs', icon: FileText },
  { value: 'complet' as const, label: 'Complet', description: 'Tout + suggestions', icon: CheckCircle },
]

export function FormModeSelector({ mode, onModeChange }: FormModeSelectorProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentIndex = MODES.findIndex((m) => m.value === mode)
      let nextIndex = currentIndex
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % MODES.length
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        nextIndex = (currentIndex - 1 + MODES.length) % MODES.length
      } else {
        return
      }
      onModeChange(MODES[nextIndex].value)
      // Focus the newly selected button
      const container = e.currentTarget as HTMLElement
      const buttons = container.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      buttons[nextIndex]?.focus()
    },
    [mode, onModeChange],
  )

  return (
    <div
      role="radiogroup"
      aria-label="Mode de création"
      className="flex flex-col gap-2 sm:flex-row"
      onKeyDown={handleKeyDown}
    >
      {MODES.map((m) => {
        const Icon = m.icon
        const isActive = mode === m.value
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onModeChange(m.value)}
            className={cn(
              'flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-200',
              isActive
                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <div>
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.description}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
