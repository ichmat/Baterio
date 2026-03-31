import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderPayloadFull, entityRenderers, formatDiffValue } from '@/features/audit/payload-renderers'

describe('entityRenderers Quote — StatusChanged', () => {
  it('traduit Draft → Brouillon, Sent → Envoyé', () => {
    const payload = { Old: 'Draft', New: 'Sent' }
    const result = entityRenderers['Quote']!(payload, 'StatusChanged')
    render(<>{result}</>)

    expect(screen.getByText('Brouillon')).toBeInTheDocument()
    expect(screen.getByText('Envoyé')).toBeInTheDocument()
  })

  it('traduit Accepted → Validé, Refused → Refusé', () => {
    const payload = { Old: 'Accepted', New: 'Refused' }
    const result = entityRenderers['Quote']!(payload, 'StatusChanged')
    render(<>{result}</>)

    expect(screen.getByText('Validé')).toBeInTheDocument()
    expect(screen.getByText('Refusé')).toBeInTheDocument()
  })

  it('garde la valeur brute si statut inconnu', () => {
    const payload = { Old: 'UnknownOld', New: 'UnknownNew' }
    const result = entityRenderers['Quote']!(payload, 'StatusChanged')
    render(<>{result}</>)

    expect(screen.getByText('UnknownOld')).toBeInTheDocument()
    expect(screen.getByText('UnknownNew')).toBeInTheDocument()
  })
})

describe('entityRenderers Quote — Updated with Priority', () => {
  it('traduit Normal → Normale, High → Haute', () => {
    const payload = { Priority: { Old: 'Normal', New: 'High' } }
    const result = entityRenderers['Quote']!(payload, 'Updated')
    render(<>{result}</>)

    expect(screen.getByText('Normale')).toBeInTheDocument()
    expect(screen.getByText('Haute')).toBeInTheDocument()
  })
})

describe('entityRenderers Quote — fallback', () => {
  it('retourne null pour action non gérée', () => {
    const payload = { someField: 'value' }
    const result = entityRenderers['Quote']!(payload, 'Created')
    expect(result).toBeNull()
  })
})

describe('renderPayloadFull — CommentAdded', () => {
  it('rend le texte complet du commentaire', () => {
    const payload = { content: 'Commentaire complet multi-ligne\nAvec retour à la ligne' }
    const result = renderPayloadFull(payload, 'CommentAdded', 'Quote')

    render(<>{result}</>)

    expect(screen.getByText(/Commentaire complet multi-ligne/)).toBeInTheDocument()
    expect(screen.getByText(/Avec retour à la ligne/)).toBeInTheDocument()
  })

  it('retourne null si content absent', () => {
    const payload = { someOtherField: 'value' }
    const result = renderPayloadFull(payload, 'CommentAdded', 'Quote')

    // Falls through to default case which returns null for unknown shapes
    expect(result).toBeNull()
  })
})

describe('formatDiffValue', () => {
  it('rend vide en italique pour null', () => {
    const result = formatDiffValue(null)
    render(<>{result}</>)
    expect(screen.getByText('vide')).toBeInTheDocument()
    expect(screen.getByText('vide').tagName).toBe('EM')
  })

  it('rend vide en italique pour undefined', () => {
    const result = formatDiffValue(undefined)
    render(<>{result}</>)
    expect(screen.getByText('vide')).toBeInTheDocument()
  })

  it('rend string vide comme string vide (pas vide en italique)', () => {
    const result = formatDiffValue('')
    expect(result).toBe('')
  })

  it('rend un texte normal', () => {
    const result = formatDiffValue('texte')
    expect(result).toBe('texte')
  })

  it('rend 0 comme "0"', () => {
    const result = formatDiffValue(0)
    expect(result).toBe('0')
  })
})

describe('entityRenderers Quote — Updated with Lines:Added', () => {
  it('rend le texte Ligne ajoutée avec description et montant', () => {
    const payload = {
      'Lines:Added:42': { Description: 'Pose carrelage', Quantity: 5, UnitPriceExclTax: 120 },
    }
    const result = entityRenderers['Quote']!(payload, 'Updated', false)
    render(<>{result}</>)

    expect(screen.getByText(/Ligne ajoutée/)).toBeInTheDocument()
    expect(screen.getByText(/Pose carrelage/)).toBeInTheDocument()
  })
})

describe('entityRenderers Quote — Updated with Lines:Removed', () => {
  it('rend le texte Ligne supprimée', () => {
    const payload = {
      'Lines:Removed:10': { Description: 'Ancienne ligne', Quantity: 2, UnitPriceExclTax: 50 },
    }
    const result = entityRenderers['Quote']!(payload, 'Updated', false)
    render(<>{result}</>)

    expect(screen.getByText(/Ligne supprimée/)).toBeInTheDocument()
    expect(screen.getByText(/Ancienne ligne/)).toBeInTheDocument()
  })
})

describe('entityRenderers Quote — Updated with Lines:Modified', () => {
  it('rend le format avec LineDescription et old → new', () => {
    const payload = {
      'Lines:Modified:7:Quantity': { Old: 10, New: 15, LineDescription: 'Pose carrelage 60x60' },
    }
    const result = entityRenderers['Quote']!(payload, 'Updated', false)
    render(<>{result}</>)

    expect(screen.getByText(/Pose carrelage 60x60/)).toBeInTheDocument()
    expect(screen.getByText(/quantité/)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })
})

describe('entityRenderers Quote — Updated mix standard + lines', () => {
  it('rend les diffs standard ET les lignes en mode full', () => {
    const payload = {
      Subject: { Old: 'Ancien objet', New: 'Nouvel objet' },
      'Lines:Added:99': { Description: 'New line', Quantity: 1, UnitPriceExclTax: 200 },
      'Lines:Removed:5': { Description: 'Old line', Quantity: 3, UnitPriceExclTax: 100 },
      'Lines:Modified:8:Quantity': { Old: 2, New: 4, LineDescription: 'Modified line' },
    }
    const result = entityRenderers['Quote']!(payload, 'Updated', false)
    render(<>{result}</>)

    // Standard diff
    expect(screen.getByText('Ancien objet')).toBeInTheDocument()
    expect(screen.getByText('Nouvel objet')).toBeInTheDocument()
    // Lines
    expect(screen.getByText(/Ligne ajoutée/)).toBeInTheDocument()
    expect(screen.getByText(/Ligne supprimée/)).toBeInTheDocument()
    expect(screen.getByText(/Modified line/)).toBeInTheDocument()
  })

  it('rend les diffs standard ET le résumé lignes en mode compact', () => {
    const payload = {
      Subject: { Old: 'Ancien', New: 'Nouveau' },
      'Lines:Added:10': { Description: 'New', Quantity: 1, UnitPriceExclTax: 100 },
      'Lines:Modified:3:Quantity': { Old: 1, New: 5, LineDescription: 'Existing' },
    }
    const result = entityRenderers['Quote']!(payload, 'Updated', true)
    expect(result).toContain('objet')
    expect(result).toContain('1 ligne modifiée')
    expect(result).toContain('1 ligne ajoutée')
  })
})

describe('entityRenderers Quote — Updated Lines:Modified sans LineDescription', () => {
  it('ne duplique pas Ligne #id quand Description change', () => {
    const payload = {
      'Lines:Modified:42:Description': { Old: 'Ancien texte', New: 'Nouveau texte' },
    }
    const result = entityRenderers['Quote']!(payload, 'Updated', false)
    render(<>{result}</>)

    // Doit afficher "Ligne #42" une seule fois, pas "Ligne #42 (Ligne #42)"
    const text = document.body.textContent ?? ''
    const matches = text.match(/Ligne #42/g)
    expect(matches).toHaveLength(1)
  })
})
