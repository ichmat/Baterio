import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { CustomerSearchResult } from '@/features/clients/types'
import type { QuoteResponse, UpdateQuoteRequest } from './types'
import { useUpdateQuote } from './useDevis'
import { DevisFormFields } from './DevisFormFields'

interface EditDevisFormProps {
  quote: QuoteResponse
  onSuccess: () => void
}

function parseCustomFields(raw: string | null): Record<string, any> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function EditDevisForm({ quote, onSuccess }: EditDevisFormProps) {
  const updateQuote = useUpdateQuote()

  const [selectedCustomer] = useState<CustomerSearchResult>({
    id: quote.customerId,
    lastName: quote.customerName,
    firstName: '',
    telephone: null,
    email: null,
    quoteCount: 0,
    siteCount: 0,
  })

  const form = useForm<Omit<UpdateQuoteRequest, 'customFields'> & { customFields?: Record<string, any> }>({
    defaultValues: {
      subject: quote.subject,
      priority: quote.priority,
      validityDate: quote.validityDate ?? '',
      estimatedDuration: quote.estimatedDuration ?? '',
      siteAddress: quote.siteAddress ?? '',
      taxRate: quote.taxRate ?? 20,
      reminderDate: quote.reminderDate ?? '',
      notes: quote.notes ?? '',
      lines: quote.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPriceExclTax: l.unitPriceExclTax,
        displayOrder: l.displayOrder,
      })),
      customFields: parseCustomFields(quote.customFields),
    },
  })

  const onSubmit = async (data: Omit<UpdateQuoteRequest, 'customFields'> & { customFields?: Record<string, any> }) => {
    const payload: UpdateQuoteRequest = {
      subject: data.subject.trim(),
      priority: data.priority || 'Normal',
      validityDate: data.validityDate || null as any,
      estimatedDuration: data.estimatedDuration?.trim() || null as any,
      siteAddress: data.siteAddress!.trim(),
      taxRate: data.taxRate ?? null as any,
      reminderDate: data.reminderDate || null as any,
      notes: data.notes?.trim() || null as any,
      lines: data.lines?.map((line, i) => ({
        description: line.description.trim(),
        quantity: line.quantity,
        unitPriceExclTax: line.unitPriceExclTax,
        displayOrder: i,
      })),
    }

    // Serialize custom fields — always send, even if empty
    const customFields = data.customFields
    payload.customFields = customFields && Object.keys(customFields).length > 0
      ? JSON.stringify(customFields)
      : null as any

    try {
      await updateQuote.mutateAsync({ id: quote.id, data: payload })
      toast.success('Devis modifié')
      onSuccess()
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Une erreur est survenue')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifier le devis {quote.reference}</h1>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <DevisFormFields
            mode="complet"
            onModeChange={() => {}}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={() => {}}
            isEdit
            hideFormModeSelector
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
              disabled={updateQuote.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateQuote.isPending}>
              {updateQuote.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
