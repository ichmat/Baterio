import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateUserDialog } from '@/features/admin/CreateUserDialog'

// Store the onValueChange callback so SelectItem can call it
let selectOnValueChange: ((v: string) => void) | null = null

// Mock Radix Select with a native <select> for testability in happy-dom
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => {
    selectOnValueChange = onValueChange
    return <div>{children}</div>
  },
  SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => <button type="button" id={id} aria-label="Rôle">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button type="button" data-testid={`select-item-${value}`} onClick={() => selectOnValueChange?.(value)}>{children}</button>
  ),
}))

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

  it('displays server error inline when onSubmit rejects', async () => {
    mockOnSubmit.mockRejectedValueOnce({ message: 'Un utilisateur avec cet email existe déjà' })
    const user = userEvent.setup()
    renderDialog()

    // Fill all text fields
    await user.type(screen.getByLabelText('Prénom'), 'Jean')
    await user.type(screen.getByLabelText('Nom'), 'Dupont')
    await user.type(screen.getByLabelText('Email'), 'jean@test.fr')
    await user.type(screen.getByLabelText('Mot de passe temporaire'), 'Password123!')

    // Select role via mocked Select component
    await user.click(screen.getByTestId('select-item-Chef'))

    // Submit the form
    await user.click(screen.getByText('Créer'))

    // Server error should appear inline
    await waitFor(() => {
      expect(screen.getByText('Un utilisateur avec cet email existe déjà')).toBeInTheDocument()
    })

    // Dialog should remain open (onOpenChange not called with false)
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
  })
})
