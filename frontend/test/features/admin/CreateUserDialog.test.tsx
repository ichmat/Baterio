import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateUserDialog } from '@/features/admin/CreateUserDialog'

const mockOnSubmit = vi.fn()
const mockOnOpenChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

function renderDialog(open = true) {
  return render(
    <CreateUserDialog
      open={open}
      onOpenChange={mockOnOpenChange}
      onSubmit={mockOnSubmit}
    />,
  )
}

describe('CreateUserDialog', () => {
  it('renders form fields when open', () => {
    renderDialog()

    expect(screen.getByLabelText('Prénom')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe temporaire')).toBeInTheDocument()
    expect(screen.getByLabelText('Rôle')).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText('Le prénom est requis')).toBeInTheDocument()
      expect(screen.getByText('Le nom est requis')).toBeInTheDocument()
      expect(screen.getByText("L'email est requis")).toBeInTheDocument()
      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument()
      expect(screen.getByText('Le rôle est requis')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for short password', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Mot de passe temporaire'), 'short')
    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Use a value that passes HTML5 type="email" but fails our custom regex
    await user.type(screen.getByLabelText('Email'), 'user@incomplete')
    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText("L'email n'est pas valide")).toBeInTheDocument()
    })
  })

  it('does not submit when validation fails', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Fill only some fields
    await user.type(screen.getByLabelText('Prénom'), 'Test')
    await user.click(screen.getByText('Créer'))

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('renders cancel button', () => {
    renderDialog()

    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })
})
