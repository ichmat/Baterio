import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateCustomFieldDialog, type CreateCustomFieldDefaultAppliesTo } from '@/features/admin/CreateCustomFieldDialog'
import * as api from '@/features/admin/api'
import { toast } from 'sonner'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Store onValueChange callbacks per select instance by trigger id
const selectCallbacks: Record<string, (v: string) => void> = {}
let currentSelectId = ''

vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => {
    // Temporarily store callback; will be associated with trigger id in SelectTrigger
    selectCallbacks['__pending'] = onValueChange
    return <div>{children}</div>
  },
  SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => {
    if (id && selectCallbacks['__pending']) {
      selectCallbacks[id] = selectCallbacks['__pending']
      delete selectCallbacks['__pending']
      currentSelectId = id
    }
    return <button type="button" id={id}>{children}</button>
  },
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-select-id={currentSelectId}>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
    const capturedId = currentSelectId
    return (
      <button type="button" data-testid={`select-item-${value}`} onClick={() => {
        selectCallbacks[capturedId]?.(value)
      }}>{children}</button>
    )
  },
}))

const mockOnOpenChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

function renderDialog(open = true, defaultAppliesTo: CreateCustomFieldDefaultAppliesTo = 'quotes') {
  return renderWithProviders(
    <CreateCustomFieldDialog
      open={open}
      onOpenChange={mockOnOpenChange}
      defaultAppliesTo={defaultAppliesTo}
    />,
  )
}

describe('CreateCustomFieldDialog', () => {
  it('renders form fields when open', () => {
    renderDialog()

    expect(screen.getByLabelText('Label du champ')).toBeInTheDocument()
    expect(screen.getByText('Devis')).toBeInTheDocument()
    expect(screen.getByText('Chantier')).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText('Le label est requis')).toBeInTheDocument()
    })
  })

  it('shows validation error when no applies_to is checked', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Fill required fields so RHF rules pass before custom validation
    await user.type(screen.getByLabelText('Label du champ'), 'Test')
    await user.click(screen.getByTestId('select-item-Text'))
    await user.click(screen.getByTestId('select-item-Never'))

    // Only Devis is checked by default (defaultAppliesTo='quotes'), uncheck it
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0]) // uncheck Devis

    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(screen.getByText(/doit s'appliquer aux devis/)).toBeInTheDocument()
    })
  })

  it('shows warning when RequiredAtCreation is selected', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByTestId('select-item-RequiredAtCreation'))

    await waitFor(() => {
      expect(screen.getByText(/Attention — ce champ sera requis/)).toBeInTheDocument()
    })
  })

  it('shows options fields for choice types', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByTestId('select-item-SingleChoice'))

    await waitFor(() => {
      expect(screen.getByText('Ajouter une option')).toBeInTheDocument()
    })
  })

  it('submits valid form and shows toast', async () => {
    vi.mocked(api.createCustomField).mockResolvedValue({
      id: 1,
      label: 'Test',
      fieldType: 'Text',
      obligationLevel: 'Never',
      appliesToQuotes: true,
      appliesToSites: true,
      displayOrder: 0,
      createdAt: '2026-01-01T00:00:00Z',
    })

    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Label du champ'), 'Test')
    await user.click(screen.getByTestId('select-item-Text'))
    await user.click(screen.getByTestId('select-item-Never'))
    await user.click(screen.getByText('Créer'))

    await waitFor(() => {
      expect(api.createCustomField).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Champ créé')
    })
  })
})
