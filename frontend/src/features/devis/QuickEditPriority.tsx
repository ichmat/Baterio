import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useUpdateQuote } from './useDevis'
import { buildUpdateRequest } from './quote-helpers'
import { PRIORITY_CONFIG } from './status-config'
import type { QuoteResponse } from './types'

const PRIORITY_KEYS = ['High', 'Normal', 'Low'] as const

interface QuickEditPriorityProps {
  quote: QuoteResponse
  onUpdate: () => void
}

export function QuickEditPriority({ quote, onUpdate }: QuickEditPriorityProps) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useUpdateQuote()

  const cfg = PRIORITY_CONFIG[quote.priority] ?? PRIORITY_CONFIG.Normal

  function handleSelect(priority: string) {
    mutate(
      { id: quote.id, data: buildUpdateRequest(quote, { priority }) },
      {
        onSuccess: () => {
          toast.success('Priorité mise à jour')
          setOpen(false)
          onUpdate()
        },
        onError: () => {
          toast.error('Erreur lors de la mise à jour')
        },
      },
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${cfg.color}`}
          aria-label="Modifier la priorité"
        >
          {cfg.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">
        <div className="flex flex-col gap-1">
          {PRIORITY_KEYS.map((key) => {
            const opt = PRIORITY_CONFIG[key]
            return (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                disabled={isPending || key === quote.priority}
                className={`justify-start ${opt.color}`}
                onClick={() => handleSelect(key)}
              >
                {opt.label}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
