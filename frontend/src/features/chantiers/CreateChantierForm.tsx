import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { getCustomFields } from '@/features/admin/api'
import { useQuote } from '@/features/devis/useDevis'
import { CustomerAutocomplete } from '@/features/clients/CustomerAutocomplete'
import { DynamicCustomFields } from '@/features/devis/DynamicCustomFields'
import type { CustomerSearchResult } from '@/features/clients/types'
import type { CreateSiteRequest } from './types'
import { useCreateSite } from './useSites'

export function CreateChantierForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const quoteIdParam = searchParams.get('quoteId')
  const quoteId = quoteIdParam ? Number(quoteIdParam) : undefined

  const createSite = useCreateSite()
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)

  // Load quote data if quoteId is provided
  const { data: quote, isLoading: quoteLoading } = useQuote(quoteId ?? 0)

  // Load site custom field definitions
  const { data: definitions } = useQuery({
    queryKey: ['custom-fields', 'sites'],
    queryFn: () => getCustomFields({ appliesToSites: true }),
    select: (fields) =>
      [...fields].sort(
        (a, b) => (a.displayOrderSites ?? 999) - (b.displayOrderSites ?? 999),
      ),
  })

  const form = useForm<CreateSiteRequest>({
    defaultValues: {
      customerId: 0,
      subject: '',
      siteAddress: '',
      startDate: '',
      endDate: '',
      notes: '',
    },
  })

  // Pre-fill all fields from quote (setValue only — no reset to avoid Controller re-mount)
  useEffect(() => {
    if (quote && quoteId) {
      form.setValue('customerId', quote.customerId)
      form.setValue('quoteId' as any, quote.id)
      form.setValue('subject', quote.subject ?? '')
      form.setValue('siteAddress', quote.siteAddress ?? '')
      if (quote.customFields && definitions) {
        for (const cf of quote.customFields) {
          const def = definitions.find(d => d.id === cf.id)
          if (def?.appliesToSites) {
            console.log(`apply to field ${cf.id} value ${cf.value}`)
            form.setValue(`customFields.${cf.id}` as any, cf.value)
          }
        }
      }
    }
  }, [quote, quoteId, definitions, form])

  const onSubmit = async (data: CreateSiteRequest) => {
    if (!data.customerId && !quoteId) {
      form.setError('customerId' as any, { message: 'Le client est obligatoire' })
      return
    }

    if (!data.subject?.trim()) {
      form.setError('subject' as any, { message: "L'objet est obligatoire" })
      return
    }

    if (!data.siteAddress?.trim()) {
      form.setError('siteAddress' as any, { message: "L'adresse est obligatoire" })
      return
    }

    const hasStart = !!data.startDate
    const hasEnd = !!data.endDate
    if (hasStart !== hasEnd) {
      toast.error('Les dates de début et de fin doivent être renseignées ensemble')
      return
    }

    const payload: CreateSiteRequest = {
      customerId: data.customerId || (quote?.customerId ?? 0),
      quoteId: quoteId ?? undefined,
      subject: data.subject.trim(),
      siteAddress: data.siteAddress.trim(),
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      notes: data.notes?.trim() || undefined,
    }

    // Build custom fields
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
      const result = await createSite.mutateAsync(payload)
      toast.success('Chantier créé')
      navigate(`/chantiers/${result.id}`)
    } catch (err: unknown) {
      const apiError = err as { message?: string }
      toast.error(apiError?.message ?? 'Une erreur est survenue')
    }
  }

  if (quoteId && quoteLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Chargement du devis...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Nouveau chantier</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* Client */}
            <div className="space-y-2">
              <Label>Client *</Label>
              {quoteId && quote ? (
                <>
                  <p className="text-sm font-medium">{quote.customerName}</p>
                  <input type="hidden" {...form.register('customerId', { valueAsNumber: true })} />
                </>
              ) : (
                <Controller
                  name="customerId"
                  control={form.control}
                  render={() => (
                    <CustomerAutocomplete
                      value={selectedCustomer}
                      onSelect={(customer) => {
                        setSelectedCustomer(customer)
                        form.setValue('customerId', customer.id)
                        form.clearErrors('customerId' as any)
                      }}
                    />
                  )}
                />
              )}
              {form.formState.errors.customerId && (
                <p className="text-sm text-destructive">{(form.formState.errors as any).customerId?.message}</p>
              )}
            </div>

            {/* Objet */}
            <div className="space-y-2">
              <Label htmlFor="subject">Objet *</Label>
              <Input
                id="subject"
                {...form.register('subject')}
                placeholder="Nature des travaux"
              />
              {form.formState.errors.subject && (
                <p className="text-sm text-destructive">{(form.formState.errors as any).subject?.message}</p>
              )}
            </div>

            {/* Adresse chantier */}
            <div className="space-y-2">
              <Label htmlFor="siteAddress">Adresse du chantier *</Label>
              <Textarea
                id="siteAddress"
                {...form.register('siteAddress')}
                placeholder="Adresse complète du chantier"
              />
              {form.formState.errors.siteAddress && (
                <p className="text-sm text-destructive">{(form.formState.errors as any).siteAddress?.message}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Date de fin prévue</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register('endDate')}
                />
              </div>
            </div>

            {/* Champs custom */}
            {definitions && definitions.length > 0 && (
              <DynamicCustomFields
                definitions={definitions}
                control={form.control}
                mode="complet"
                requiredLevel="RequiredForSiteConversion"
              />
            )}
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Notes internes (optionnel)"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={createSite.isPending}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={createSite.isPending}>
            {createSite.isPending ? 'Création...' : 'Créer le chantier'}
          </Button>
        </div>
      </form>
    </div>
  )
}
