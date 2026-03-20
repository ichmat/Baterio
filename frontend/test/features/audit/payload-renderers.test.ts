import { describe, it, expect } from 'vitest'
import { getFieldLabel, renderPayloadCompact } from '@/features/audit/payload-renderers'

describe('getFieldLabel', () => {
  it('retourne le label traduit pour un champ Customer connu', () => {
    expect(getFieldLabel('Customer', 'lastName')).toBe('nom')
    expect(getFieldLabel('Customer', 'LastName')).toBe('nom')
    expect(getFieldLabel('Customer', 'telephone')).toBe('téléphone')
  })

  it('retourne le label traduit pour User', () => {
    expect(getFieldLabel('User', 'Role')).toBe('rôle')
    expect(getFieldLabel('User', 'IsActive')).toBe('actif')
  })

  it('retourne le label traduit pour CustomField', () => {
    expect(getFieldLabel('CustomField', 'Label')).toBe('libellé')
    expect(getFieldLabel('CustomField', 'AppliesToQuotes')).toBe('appliqué aux devis')
  })

  it('retourne le label traduit pour CompanyInfo', () => {
    expect(getFieldLabel('CompanyInfo', 'CompanyName')).toBe('raison sociale')
    expect(getFieldLabel('CompanyInfo', 'Siret')).toBe('SIRET')
  })

  it('retourne "champs personnalisés" pour la cle legacy "CustomFields"', () => {
    expect(getFieldLabel('Quote', 'CustomFields')).toBe('champs personnalisés')
  })

  it('extrait le label apres le second ":" pour le format CustomFields:{id}:{label}', () => {
    expect(getFieldLabel('Quote', 'CustomFields:42:Type de travaux')).toBe('Type de travaux')
  })

  it('gere le format CustomFields:{id} sans label (fallback)', () => {
    expect(getFieldLabel('Quote', 'CustomFields:99')).toBe('99')
  })

  it('gere un label contenant ":" dans CustomFields namespace', () => {
    // This shouldn't happen with validation, but test parser robustness
    expect(getFieldLabel('Quote', 'CustomFields:1:A:B')).toBe('A:B')
  })

  it('fallback sur le fieldKey brut pour un champ inconnu', () => {
    expect(getFieldLabel('Customer', 'unknownField')).toBe('unknownField')
  })

  it('fallback sur le fieldKey brut pour un entityType inconnu', () => {
    expect(getFieldLabel('UnknownEntity', 'title')).toBe('title')
  })

  it('retourne le label traduit pour Quote', () => {
    expect(getFieldLabel('Quote', 'Subject')).toBe('objet')
    expect(getFieldLabel('Quote', 'subject')).toBe('objet')
    expect(getFieldLabel('Quote', 'Priority')).toBe('priorité')
    expect(getFieldLabel('Quote', 'Status')).toBe('statut')
    expect(getFieldLabel('Quote', 'ReminderDate')).toBe('date de relance')
    expect(getFieldLabel('Quote', 'ValidityDate')).toBe('date de validité')
    expect(getFieldLabel('Quote', 'EstimatedDuration')).toBe('durée estimée')
    expect(getFieldLabel('Quote', 'SiteAddress')).toBe('adresse chantier')
    expect(getFieldLabel('Quote', 'TaxRate')).toBe('taux TVA')
    expect(getFieldLabel('Quote', 'Notes')).toBe('notes')
    expect(getFieldLabel('Quote', 'AmountExclTax')).toBe('montant HT')
    expect(getFieldLabel('Quote', 'AmountInclTax')).toBe('montant TTC')
  })
})

describe('renderPayloadCompact', () => {
  it('rend les champs modifiés pour un diff Updated', () => {
    const payload = { LastName: { Old: 'Dupon', New: 'Dupont' }, Telephone: { Old: '0600', New: '0601' } }
    const result = renderPayloadCompact(payload, 'Updated', 'Customer')
    expect(result).toBe('nom, téléphone')
  })

  it('rend le nom du champ pour un single field Updated', () => {
    const payload = { Field: 'Role', OldValue: 'Secretary', NewValue: 'Admin' }
    const result = renderPayloadCompact(payload, 'Updated', 'User')
    expect(result).toBe('rôle')
  })

  it('rend les valeurs pour Created', () => {
    const payload = { LastName: 'Dupont', FirstName: 'Jean' }
    const result = renderPayloadCompact(payload, 'Created', 'Customer')
    expect(result).toContain('nom : Dupont')
    expect(result).toContain('prénom : Jean')
  })

  it('rend le filename pour FileAttached', () => {
    const payload = { attachmentId: 1, filename: 'devis.pdf', contentType: 'application/pdf', size: 245000 }
    const result = renderPayloadCompact(payload, 'FileAttached', 'Customer')
    expect(result).toBe('devis.pdf')
  })

  it('rend le label pour Deleted', () => {
    const payload = { Label: 'Mon champ' }
    const result = renderPayloadCompact(payload, 'Deleted', 'CustomField')
    expect(result).toBe('Mon champ')
  })

  it('retourne vide pour Deleted sans payload', () => {
    const result = renderPayloadCompact({}, 'Deleted', 'Customer')
    expect(result).toBe('')
  })

  it('rend le contexte pour Reorder', () => {
    const payload = { Action: 'Reorder', Context: 'quotes', FieldIds: [1, 2, 3] }
    const result = renderPayloadCompact(payload, 'Updated', 'CustomField')
    expect(result).toBe('Réorganisation des champs devis')
  })

  it('rend le filename pour FileRemoved', () => {
    const payload = { attachmentId: 5, filename: 'facture.pdf' }
    const result = renderPayloadCompact(payload, 'FileRemoved', 'Quote')
    expect(result).toBe('facture.pdf')
  })

  it('rend le contenu pour CommentAdded compact', () => {
    const payload = { content: 'Ceci est un commentaire de test' }
    const result = renderPayloadCompact(payload, 'CommentAdded', 'Quote')
    expect(result).toBe('Ceci est un commentaire de test')
  })
})
