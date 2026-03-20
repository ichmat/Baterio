import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useUpdateQuote } from './useDevis'
import { buildUpdateRequest } from './quote-helpers'
import { formatDate } from '@/lib/format-date'
import type { QuoteResponse } from './types'

interface QuickEditReminderDateProps {
  quote: QuoteResponse
  onUpdate: () => void
}

export function QuickEditReminderDate({ quote, onUpdate }: QuickEditReminderDateProps) {
  const [open, setOpen] = useState(false)
  const [dateValue, setDateValue] = useState(quote.reminderDate ?? '')
  const { mutate, isPending } = useUpdateQuote()

  function handleSave() {
    if (!dateValue) return
    mutate(
      { id: quote.id, data: buildUpdateRequest(quote, { reminderDate: dateValue }) },
      {
        onSuccess: () => {
          toast.success('Date de relance mise à jour')
          setOpen(false)
          onUpdate()
        },
        onError: () => {
          toast.error('Erreur lors de la mise à jour')
        },
      },
    )
  }

  function handleRemove() {
    mutate(
      { id: quote.id, data: buildUpdateRequest(quote, { reminderDate: null }) },
      {
        onSuccess: () => {
          toast.success('Date de relance mise à jour')
          setDateValue('')
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
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          aria-label="Modifier la date de relance"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {quote.reminderDate ? formatDate(quote.reminderDate) : 'Ajouter une relance'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Date de relance</label>
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending || !dateValue} onClick={handleSave}>
              Confirmer
            </Button>
            {quote.reminderDate && (
              <Button size="sm" variant="destructive" disabled={isPending} onClick={handleRemove}>
                Supprimer la relance
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
