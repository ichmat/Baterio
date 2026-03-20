import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderPayloadFull, entityRenderers } from '@/features/audit/payload-renderers'

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
