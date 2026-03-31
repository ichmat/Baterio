import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { CustomerSearchResult } from '@/features/clients/types'
import type { CustomFieldEntry, QuoteResponse, UpdateQuoteRequest } from './types'
import { useUpdateQuote } from './useDevis'
import { DevisFormFields } from './DevisFormFields'
import { useCustomFieldDefinitions } from './useCustomFieldDefinitions'

interface EditDevisFormProps {
  quote: QuoteResponse
  onSuccess: () => void
}

function parseCustomFields(raw: CustomFieldEntry[] | null): Record<string, any> {
  if (!raw || raw.length === 0) return {}
  return Object.fromEntries(raw.map(entry => [String(entry.id), entry.value]))
}

export function EditDevisForm({ quote, onSuccess }: EditDevisFormProps) {
  const updateQuote = useUpdateQuote()
  const { data: definitions } = useCustomFieldDefinitions()

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
        id: l.id,
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
        id: line.id,
        description: line.description.trim(),
        quantity: line.quantity,
        unitPriceExclTax: line.unitPriceExclTax,
        displayOrder: i,
      })),
    }

    // Build CustomFieldEntry[] from form state and definitions
    const rawCf = data.customFields
    if (rawCf && Object.keys(rawCf).length > 0 && definitions) {
      payload.customFields = Object.entries(rawCf)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([fieldId, value]) => {
          const def = definitions.find(d => d.id === Number(fieldId))
          return { id: Number(fieldId), label: def?.label ?? '', value }
        })
    } else {
      payload.customFields = null
    }

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
