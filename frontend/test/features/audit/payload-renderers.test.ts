import { describe, it, expect } from 'vitest'
import { getFieldLabel, renderPayloadCompact, renderQuoteLinesDiff } from '@/features/audit/payload-renderers'

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

  it('rend les valeurs lisibles pour un diff CustomFields au nouveau format', () => {
    const payload = {
      'CustomFields:5:Type de travaux': { Old: 'Neuf', New: 'Renovation' },
    }
    const result = renderPayloadCompact(payload, 'Updated', 'Quote')
    expect(result).toBe('Type de travaux')
  })

  it('rend les valeurs tableau pour un diff CustomFields MultipleChoice', () => {
    const payload = {
      'CustomFields:8:Prestations': { Old: ['Peinture', 'Plomberie'], New: ['Peinture'] },
    }
    const result = renderPayloadCompact(payload, 'Updated', 'Quote')
    expect(result).toBe('Prestations')
  })

  it('gere les anciennes valeurs brutes (tableaux) dans le diff', () => {
    const payload = {
      'CustomFields:5:Type': { Old: '[null, 5, "Neuf"]', New: '[null, 5, "Renovation"]' },
    }
    const result = renderPayloadCompact(payload, 'Updated', 'Quote')
    expect(result).toBe('Type')
  })
})

describe('renderQuoteLinesDiff — compact', () => {
  it('resume le nombre de lignes modifiées, ajoutées, supprimées', () => {
    const payload = {
      'Lines:Modified:1:Quantity': { Old: 10, New: 15, LineDescription: 'L1' },
      'Lines:Modified:1:UnitPriceExclTax': { Old: 50, New: 60, LineDescription: 'L1' },
      'Lines:Modified:2:Quantity': { Old: 5, New: 8, LineDescription: 'L2' },
      'Lines:Added:99': { Description: 'New', Quantity: 1, UnitPriceExclTax: 100 },
      'Lines:Removed:3': { Description: 'Old', Quantity: 2, UnitPriceExclTax: 50 },
      'Lines:Removed:4': { Description: 'Old2', Quantity: 3, UnitPriceExclTax: 30 },
    }
    const result = renderQuoteLinesDiff(payload, true) as string
    expect(result).toContain('2 lignes modifiées')
    expect(result).toContain('1 ligne ajoutée')
    expect(result).toContain('2 lignes supprimées')
  })

  it('utilise le singulier pour 1 ligne modifiée', () => {
    const payload = {
      'Lines:Modified:5:Quantity': { Old: 1, New: 2, LineDescription: 'L' },
    }
    const result = renderQuoteLinesDiff(payload, true) as string
    expect(result).toBe('1 ligne modifiée')
  })

  it('retourne null si aucune entrée Lines:*', () => {
    const payload = { Subject: { Old: 'A', New: 'B' } }
    const result = renderQuoteLinesDiff(payload, true)
    expect(result).toBeNull()
  })
})

describe('renderPayloadCompact — mix diffs standard + lines', () => {
  it('combine les diffs standard et le résumé lignes', () => {
    const payload = {
      Subject: { Old: 'Ancien', New: 'Nouveau' },
      'Lines:Added:10': { Description: 'New', Quantity: 1, UnitPriceExclTax: 100 },
    }
    const result = renderPayloadCompact(payload, 'Updated', 'Quote')
    expect(result).toContain('objet')
    expect(result).toContain('1 ligne ajoutée')
  })
})
