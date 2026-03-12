import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getCompanyInfo, updateCompanyInfo } from './api'
import type { CompanyInfoResponse, UpdateCompanyInfoRequest } from './types'

export function CompanySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<UpdateCompanyInfoRequest>({
    companyName: '',
    address: '',
    siret: '',
    vatNumber: '',
    legalForm: '',
    insurancePolicyNumber: '',
    insuranceProvider: '',
    insuranceCoverage: '',
    defaultPaymentTerms: '',
  })

  const loadData = useCallback(async () => {
    try {
      const data = await getCompanyInfo()
      setForm({
        companyName: data.companyName ?? '',
        address: data.address ?? '',
        siret: data.siret ?? '',
        vatNumber: data.vatNumber ?? '',
        legalForm: data.legalForm ?? '',
        insurancePolicyNumber: data.insurancePolicyNumber ?? '',
        insuranceProvider: data.insuranceProvider ?? '',
        insuranceCoverage: data.insuranceCoverage ?? '',
        defaultPaymentTerms: data.defaultPaymentTerms ?? '',
      })
    } catch {
      toast.error('Erreur lors du chargement des informations entreprise')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleChange = (field: keyof UpdateCompanyInfoRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateCompanyInfo(form)
      toast.success('Informations enregistrées')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Raison sociale</Label>
            <Input
              id="companyName"
              value={form.companyName ?? ''}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="Ex: Mon Entreprise SARL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={form.address ?? ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ex: 12 rue des Artisans, 75011 Paris"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalForm">Forme juridique</Label>
            <Input
              id="legalForm"
              value={form.legalForm ?? ''}
              onChange={(e) => handleChange('legalForm', e.target.value)}
              placeholder="Ex: SARL, SAS, EURL, Auto-entrepreneur"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identification fiscale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              value={form.siret ?? ''}
              onChange={(e) => handleChange('siret', e.target.value)}
              placeholder="14 chiffres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
            <Input
              id="vatNumber"
              value={form.vatNumber ?? ''}
              onChange={(e) => handleChange('vatNumber', e.target.value)}
              placeholder="Ex: FR12345678901"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assurance décennale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="insurancePolicyNumber">Numéro de police</Label>
            <Input
              id="insurancePolicyNumber"
              value={form.insurancePolicyNumber ?? ''}
              onChange={(e) => handleChange('insurancePolicyNumber', e.target.value)}
              placeholder="Ex: DEC-2024-001234"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceProvider">Assureur</Label>
            <Input
              id="insuranceProvider"
              value={form.insuranceProvider ?? ''}
              onChange={(e) => handleChange('insuranceProvider', e.target.value)}
              placeholder="Ex: AXA Assurances"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceCoverage">Couverture géographique</Label>
            <Input
              id="insuranceCoverage"
              value={form.insuranceCoverage ?? ''}
              onChange={(e) => handleChange('insuranceCoverage', e.target.value)}
              placeholder="Ex: France métropolitaine"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conditions de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultPaymentTerms">Conditions par défaut</Label>
            <Textarea
              id="defaultPaymentTerms"
              value={form.defaultPaymentTerms ?? ''}
              onChange={(e) => handleChange('defaultPaymentTerms', e.target.value)}
              placeholder="Ex: Paiement à 30 jours"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
