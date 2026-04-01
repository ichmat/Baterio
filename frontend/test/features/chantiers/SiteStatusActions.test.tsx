import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SiteStatusActions } from '@/features/chantiers/SiteStatusActions'
import * as sitesApi from '@/features/chantiers/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SiteStatusActions', () => {
  it('Planned → 1 bouton (Démarrer)', () => {
    renderWithProviders(
      <SiteStatusActions siteId={1} currentStatus="Planned" onStatusChange={vi.fn()} />,
    )

    expect(screen.getByText('Démarrer')).toBeInTheDocument()
    expect(screen.queryByText('Mettre en pause')).not.toBeInTheDocument()
    expect(screen.queryByText('Terminer')).not.toBeInTheDocument()
  })

  it('InProgress → 2 boutons (Mettre en pause, Terminer)', () => {
    renderWithProviders(
      <SiteStatusActions siteId={1} currentStatus="InProgress" onStatusChange={vi.fn()} />,
    )

    expect(screen.getByText('Mettre en pause')).toBeInTheDocument()
    expect(screen.getByText('Terminer')).toBeInTheDocument()
  })

  it('Paused → 2 boutons (Reprendre, Terminer)', () => {
    renderWithProviders(
      <SiteStatusActions siteId={1} currentStatus="Paused" onStatusChange={vi.fn()} />,
    )

    expect(screen.getByText('Reprendre')).toBeInTheDocument()
    expect(screen.getByText('Terminer')).toBeInTheDocument()
  })

  it('Completed → aucun bouton', () => {
    const { container } = renderWithProviders(
      <SiteStatusActions siteId={1} currentStatus="Completed" onStatusChange={vi.fn()} />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('Terminer ouvre un dialog de confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <SiteStatusActions siteId={1} currentStatus="InProgress" onStatusChange={vi.fn()} />,
    )

    await user.click(screen.getByText('Terminer'))

    await waitFor(() => {
      expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument()
    })
  })

  it('mutation appelee avec le bon statut cible', async () => {
    vi.mocked(sitesApi.updateSiteStatus).mockResolvedValue({} as any)
    const onStatusChange = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <SiteStatusActions siteId={42} currentStatus="Planned" onStatusChange={onStatusChange} />,
    )

    await user.click(screen.getByText('Démarrer'))

    await waitFor(() => {
      expect(sitesApi.updateSiteStatus).toHaveBeenCalledWith(42, 'InProgress')
    })
  })

  it('callback onStatusChange appele au succes', async () => {
    vi.mocked(sitesApi.updateSiteStatus).mockResolvedValue({} as any)
    const onStatusChange = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <SiteStatusActions siteId={1} currentStatus="Planned" onStatusChange={onStatusChange} />,
    )

    await user.click(screen.getByText('Démarrer'))

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalled()
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Statut mis à jour')
  })
})
