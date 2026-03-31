import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { formatMontant } from '@/lib/format-montant'

function safeNumber(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

interface QuoteLineFieldsProps {
  index: number
  onRemove: () => void
  canRemove: boolean
}

export function QuoteLineFields({ index, onRemove, canRemove }: QuoteLineFieldsProps) {
  const { register, watch, formState: { errors } } = useFormContext()

  const quantity = safeNumber(watch(`lines.${index}.quantity`))
  const unitPrice = safeNumber(watch(`lines.${index}.unitPriceExclTax`))
  const subtotal = quantity * unitPrice

  const lineErrors = errors.lines as any

  return (
    <div className="relative grid gap-3 rounded-lg border p-4">
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Supprimer la ligne ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <div className="space-y-1">
        <Label htmlFor={`lines.${index}.description`}>Description</Label>
        <Textarea
          id={`lines.${index}.description`}
          placeholder="Description de la prestation"
          {...register(`lines.${index}.description`, { required: 'La description est requise' })}
          rows={2}
        />
        {lineErrors?.[index]?.description && (
          <p className="text-sm text-destructive">{lineErrors[index].description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`lines.${index}.quantity`}>Quantité</Label>
          <Input
            id={`lines.${index}.quantity`}
            type="number"
            min={1}
            {...register(`lines.${index}.quantity`, {
              required: 'Requis',
              valueAsNumber: true,
              min: { value: 1, message: 'Min 1' },
            })}
          />
          {lineErrors?.[index]?.quantity && (
            <p className="text-sm text-destructive">{lineErrors[index].quantity.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`lines.${index}.unitPriceExclTax`}>Prix unitaire HT</Label>
          <Input
            id={`lines.${index}.unitPriceExclTax`}
            type="number"
            min={0}
            step="0.01"
            {...register(`lines.${index}.unitPriceExclTax`, {
              required: 'Requis',
              valueAsNumber: true,
              min: { value: 0, message: 'Min 0' },
            })}
          />
          {lineErrors?.[index]?.unitPriceExclTax && (
            <p className="text-sm text-destructive">{lineErrors[index].unitPriceExclTax.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Sous-total HT</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-medium">
            {formatMontant(subtotal)}
          </div>
        </div>
      </div>
    </div>
  )
}
