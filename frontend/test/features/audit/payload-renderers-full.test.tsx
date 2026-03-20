import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderPayloadFull } from '@/features/audit/payload-renderers'

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
