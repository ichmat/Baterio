import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { CustomerSearchResult } from '@/features/clients/types'
import type { CreateQuoteRequest } from './types'
import { useCreateQuote } from './useDevis'
import { useFormMode } from './useFormMode'
import { DevisFormFields } from './DevisFormFields'
import { useCustomFieldDefinitions } from './useCustomFieldDefinitions'

export function CreateDevisForm() {
  const navigate = useNavigate()
  const { mode, updateMode } = useFormMode()
  const createQuote = useCreateQuote()
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)
  const { data: definitions } = useCustomFieldDefinitions()

  const form = useForm<CreateQuoteRequest>({
    defaultValues: {
      customerId: 0,
      subject: '',
      siteAddress: '',
      priority: 'Normal',
      taxRate: 20,
      lines: [{ description: '', quantity: 1, unitPriceExclTax: 0, displayOrder: 0 }],
    },
  })

  const onSubmit = async (data: CreateQuoteRequest) => {
    if (!data.customerId) {
      form.setError('customerId', { message: 'Le client est obligatoire' })
      return
    }

    // Filtrer les lignes vides (mode Rapide envoie une ligne vide par defaut)
    const validLines = (data.lines ?? []).filter((l) => l.description.trim() !== '')

    const payload: CreateQuoteRequest = {
      customerId: data.customerId,
      subject: data.subject.trim(),
      priority: data.priority || undefined,
      validityDate: data.validityDate || undefined,
      estimatedDuration: data.estimatedDuration?.trim() || undefined,
      siteAddress: data.siteAddress!.trim(),
      taxRate: data.taxRate ?? undefined,
      reminderDate: data.reminderDate || undefined,
      notes: data.notes?.trim() || undefined,
      lines: validLines.length > 0
        ? validLines.map((line, i) => ({
            description: line.description.trim(),
            quantity: line.quantity,
            unitPriceExclTax: line.unitPriceExclTax,
            displayOrder: i,
          }))
        : undefined,
    }

    // Construire la liste CustomFieldEntry à partir du form state et des définitions
    const rawCf = (data as any).customFields as Record<string, any> | undefined
    if (rawCf && Object.keys(rawCf).length > 0 && definitions) {
      payload.customFields = Object.entries(rawCf)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([fieldId, value]) => {
          const def = definitions.find(d => d.id === Number(fieldId))
          return { id: Number(fieldId), label: def?.label ?? '', value }
        })
    }

    try {
      const result = await createQuote.mutateAsync(payload)
      toast.success('Devis créé')
      navigate(`/devis/${result.id}`)
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Une erreur est survenue')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Nouveau devis</h1>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <DevisFormFields
            mode={mode}
            onModeChange={updateMode}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/devis')}
              disabled={createQuote.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createQuote.isPending}>
              {createQuote.isPending ? 'Création...' : 'Créer le devis'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
