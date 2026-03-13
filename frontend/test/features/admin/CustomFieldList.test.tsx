import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomFieldList } from '@/features/admin/CustomFieldList'
import * as api from '@/features/admin/api'
import { toast } from 'sonner'
import type { CustomFieldResponse } from '@/features/admin/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Select for EditCustomFieldDialog
let selectOnValueChange: ((v: string) => void) | null = null
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => {
    selectOnValueChange = onValueChange
    return <div>{children}</div>
  },
  SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => <button type="button" id={id}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button type="button" data-testid={`select-item-${value}`} onClick={() => selectOnValueChange?.(value)}>{children}</button>
  ),
}))

const mockFields: CustomFieldResponse[] = [
  {
    id: 1,
    label: 'Surface m²',
    fieldType: 'Number',
    obligationLevel: 'Never',
    appliesToQuotes: true,
    appliesToSites: true,
    displayOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    label: 'Type de travaux',
    fieldType: 'SingleChoice',
    options: '{"choices":["Neuf","Renovation"]}',
    obligationLevel: 'RequiredAtCreation',
    appliesToQuotes: true,
    appliesToSites: true,
    displayOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CustomFieldList', () => {
  it('renders list of fields with labels and badges', () => {
    renderWithProviders(<CustomFieldList fields={mockFields} allFields={mockFields} />)

    expect(screen.getByText('Surface m²')).toBeInTheDocument()
    expect(screen.getByText('Type de travaux')).toBeInTheDocument()
    expect(screen.getByText('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Choix unique')).toBeInTheDocument()
    expect(screen.getByText('Jamais obligatoire')).toBeInTheDocument()
    expect(screen.getByText('Obligatoire à la création')).toBeInTheDocument()
  })

  it('renders empty state when no fields', () => {
    renderWithProviders(<CustomFieldList fields={[]} allFields={[]} />)

    expect(screen.getByText(/Aucun champ personnalisé/)).toBeInTheDocument()
  })

  it('renders move up/down buttons', () => {
    renderWithProviders(<CustomFieldList fields={mockFields} allFields={mockFields} />)

    const upButtons = screen.getAllByLabelText('Monter')
    const downButtons = screen.getAllByLabelText('Descendre')
    expect(upButtons).toHaveLength(2)
    expect(downButtons).toHaveLength(2)
  })

  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CustomFieldList fields={mockFields} allFields={mockFields} />)

    const deleteButtons = screen.getAllByLabelText('Supprimer')
    await user.click(deleteButtons[0])

    expect(screen.getByText(/Supprimer le champ/)).toBeInTheDocument()
  })

  it('calls reorder API when move down is clicked', async () => {
    vi.mocked(api.reorderCustomFields).mockResolvedValue(mockFields)
    const user = userEvent.setup()
    renderWithProviders(<CustomFieldList fields={mockFields} allFields={mockFields} />)

    const downButtons = screen.getAllByLabelText('Descendre')
    await user.click(downButtons[0])

    await waitFor(() => {
      expect(api.reorderCustomFields).toHaveBeenCalled()
    })
  })

  it('deletes field and shows toast on confirmation', async () => {
    vi.mocked(api.deleteCustomField).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<CustomFieldList fields={mockFields} allFields={mockFields} />)

    const deleteButtons = screen.getAllByLabelText('Supprimer')
    await user.click(deleteButtons[0])

    await user.click(screen.getByText('Supprimer'))

    await waitFor(() => {
      expect(api.deleteCustomField).toHaveBeenCalledWith(1)
      expect(toast.success).toHaveBeenCalledWith('Champ supprimé')
    })
  })
})
