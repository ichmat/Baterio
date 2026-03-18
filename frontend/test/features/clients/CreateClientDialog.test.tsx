import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import * as api from '@/features/clients/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/clients/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockOnOpenChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

function renderDialog(open = true) {
  return renderWithProviders(
    <CreateClientDialog open={open} onOpenChange={mockOnOpenChange} />,
  )
}

describe('CreateClientDialog', () => {
  it('affiche le formulaire avec les champs', () => {
    renderDialog()

    expect(screen.getByLabelText('Nom')).toBeInTheDocument()
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument()
    expect(screen.getByLabelText('Téléphone')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
  })

  it('validation — Nom obligatoire', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText('Le nom est requis')).toBeInTheDocument()
    })
  })

  it('validation — Prénom obligatoire', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Nom'), 'Dupont')
    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText('Le prénom est requis')).toBeInTheDocument()
    })
  })

  it('validation — email format si renseigne', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Nom'), 'Dupont')
    await user.type(screen.getByLabelText('Prénom'), 'Jean')
    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText("L'email n'est pas valide")).toBeInTheDocument()
    })
  })

  it('soumission reussie → toast + fermeture', async () => {
    const { toast } = await import('sonner')
    vi.mocked(api.createCustomer).mockResolvedValue({
      id: 1,
      lastName: 'Dupont',
      firstName: 'Jean',
      telephone: null,
      email: null,
      address: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    })

    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Nom'), 'Dupont')
    await user.type(screen.getByLabelText('Prénom'), 'Jean')
    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Client créé')
    })
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })
})
