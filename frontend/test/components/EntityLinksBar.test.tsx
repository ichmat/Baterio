import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Users, FileText } from 'lucide-react'
import { EntityLinksBar } from '@/components/EntityLinksBar'
import { renderWithProviders } from '../test-utils'

function renderBar(links: { label: string; href: string; icon: typeof Users }[] = []) {
  return renderWithProviders(
    <MemoryRouter>
      <EntityLinksBar links={links} />
    </MemoryRouter>,
  )
}

describe('EntityLinksBar', () => {
  it('ne rend rien quand links est un tableau vide', () => {
    const { container } = renderBar([])
    expect(container.innerHTML).toBe('')
  })

  it('affiche les boutons de navigation avec icônes et labels', () => {
    renderBar([
      { label: 'Voir le client', href: '/clients/5', icon: Users },
      { label: 'Voir le devis', href: '/devis/12', icon: FileText },
    ])

    expect(screen.getByText('Voir le client')).toBeInTheDocument()
    expect(screen.getByText('Voir le devis')).toBeInTheDocument()
  })

  it('chaque bouton est un lien valide avec le bon href', () => {
    renderBar([
      { label: 'Voir le client', href: '/clients/5', icon: Users },
    ])

    const link = screen.getByRole('link', { name: /Voir le client/ })
    expect(link).toHaveAttribute('href', '/clients/5')
  })

  it('le conteneur a role="navigation" et aria-label', () => {
    renderBar([
      { label: 'Voir le client', href: '/clients/5', icon: Users },
    ])

    const nav = screen.getByRole('navigation', { name: 'Entités liées' })
    expect(nav).toBeInTheDocument()
  })
})
