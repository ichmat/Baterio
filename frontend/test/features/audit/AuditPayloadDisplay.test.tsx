import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { AuditPayloadDisplay } from '@/features/audit/AuditPayloadDisplay'
import { renderWithProviders } from '../../test-utils'

describe('AuditPayloadDisplay', () => {
  it('ne rend rien quand payload est null', () => {
    const { container } = renderWithProviders(
      <AuditPayloadDisplay payload={null} action="Updated" entityType="Customer" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('rend un diff Updated avec badges avant/après', () => {
    const payload = JSON.stringify({ LastName: { Old: 'Dupon', New: 'Dupont' } })
    renderWithProviders(
      <AuditPayloadDisplay payload={payload} action="Updated" entityType="Customer" />,
    )

    expect(screen.getByText('nom :')).toBeInTheDocument()
    expect(screen.getByText('Dupon')).toBeInTheDocument()
    expect(screen.getByText('Dupont')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('rend un single field Updated avec badges', () => {
    const payload = JSON.stringify({ Field: 'Role', OldValue: 'Secretary', NewValue: 'Admin' })
    renderWithProviders(
      <AuditPayloadDisplay payload={payload} action="Updated" entityType="User" />,
    )

    expect(screen.getByText('rôle :')).toBeInTheDocument()
    expect(screen.getByText('Secretary')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('rend un Created flat avec labels traduits', () => {
    const payload = JSON.stringify({ LastName: 'Dupont', FirstName: 'Jean' })
    renderWithProviders(
      <AuditPayloadDisplay payload={payload} action="Created" entityType="Customer" />,
    )

    expect(screen.getByText(/nom : Dupont/)).toBeInTheDocument()
    expect(screen.getByText(/prénom : Jean/)).toBeInTheDocument()
  })

  it('rend un FileAttached avec nom de fichier et taille', () => {
    const payload = JSON.stringify({
      attachmentId: 1,
      filename: 'devis.pdf',
      contentType: 'application/pdf',
      size: 245000,
    })
    renderWithProviders(
      <AuditPayloadDisplay payload={payload} action="FileAttached" entityType="Customer" />,
    )

    expect(screen.getByText('devis.pdf')).toBeInTheDocument()
    expect(screen.getByText('239 KB')).toBeInTheDocument()
  })

  it('rend du texte brut tronqué pour un JSON invalide', () => {
    const payload = 'ceci nest pas du json valide et cela fait plus de cent caractères si on le répète assez longtemps pour dépasser la limite'
    renderWithProviders(
      <AuditPayloadDisplay payload={payload} action="Updated" entityType="Customer" />,
    )

    const element = screen.getByText(/ceci nest pas du json/)
    expect(element).toBeInTheDocument()
    expect(element.textContent!.length).toBeLessThanOrEqual(100)
  })

  it('mode compact rend un span inline', () => {
    const payload = JSON.stringify({ LastName: { Old: 'Dupon', New: 'Dupont' } })
    const { container } = renderWithProviders(
      <AuditPayloadDisplay payload={payload} action="Updated" entityType="Customer" compact />,
    )

    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(span!.textContent).toContain('nom')
  })

  it('ne rend rien pour Deleted avec payload null', () => {
    const { container } = renderWithProviders(
      <AuditPayloadDisplay payload={null} action="Deleted" entityType="Customer" />,
    )
    expect(container.firstChild).toBeNull()
  })
})
