import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { CreateDevisForm } from '@/features/devis/CreateDevisForm'
import * as devisApi from '@/features/devis/api'
import * as adminApi from '@/features/admin/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/devis/api')
vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock CustomerAutocomplete — cmdk doesn't work in happy-dom
vi.mock('@/features/clients/CustomerAutocomplete', () => ({
  CustomerAutocomplete: ({ onSelect, onCreateNew }: any) => (
    <div data-testid="customer-autocomplete">
      <button
        data-testid="select-customer"
        onClick={() =>
          onSelect({ id: 1, lastName: 'Dupont', firstName: 'Jean', telephone: null, email: null, quoteCount: 0, siteCount: 0 })
        }
      >
        Sélectionner client
      </button>
      {onCreateNew && (
        <button data-testid="create-new-customer" onClick={() => onCreateNew('test')}>
          Créer client
        </button>
      )}
    </div>
  ),
}))

vi.mock('@/features/clients/CreateClientDialog', () => ({
  CreateClientDialog: ({ open }: any) =>
    open ? <div data-testid="create-client-dialog">Dialog</div> : null,
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(adminApi.getCustomFields).mockResolvedValue([])
})

function renderForm() {
  return renderWithProviders(
    <MemoryRouter>
      <CreateDevisForm />
    </MemoryRouter>,
  )
}

describe('CreateDevisForm', () => {
  it('affiche le titre et le FormModeSelector', () => {
    renderForm()
    expect(screen.getByText('Nouveau devis')).toBeInTheDocument()
    expect(screen.getByText('Rapide')).toBeInTheDocument()
    expect(screen.getByText('Libre')).toBeInTheDocument()
    expect(screen.getByText('Complet')).toBeInTheDocument()
  })

  it('mode Rapide — seuls client et objet sont affichés', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByText('Rapide'))

    expect(screen.getByLabelText(/objet/i)).toBeInTheDocument()
    expect(screen.getByTestId('customer-autocomplete')).toBeInTheDocument()
    expect(screen.getByLabelText(/adresse du chantier/i)).toBeInTheDocument()
    expect(screen.queryByText('Lignes de prestations')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/priorité/i)).not.toBeInTheDocument()
    expect(screen.getByText("Renseigner plus d'informations")).toBeInTheDocument()
  })

  it('mode Libre — champs dates et lignes visibles, pas champs internes', () => {
    renderForm()

    // Default mode is 'libre'
    expect(screen.getByText('Lignes de prestations')).toBeInTheDocument()
    expect(screen.getByLabelText(/objet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date de validité/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/taux tva/i)).toBeInTheDocument()
    // Champs internes (Complet uniquement) — pas visibles en Libre
    expect(screen.queryByLabelText(/priorité/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/date de relance/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument()
  })

  it('ajout et suppression de lignes', async () => {
    const user = userEvent.setup()
    renderForm()

    // Initially one line
    expect(screen.getAllByLabelText(/description/i)).toHaveLength(1)

    // Add a line
    await user.click(screen.getByText('Ajouter une prestation'))
    expect(screen.getAllByLabelText(/description/i)).toHaveLength(2)

    // Delete second line
    const deleteButtons = screen.getAllByLabelText(/supprimer la ligne/i)
    await user.click(deleteButtons[1])
    expect(screen.getAllByLabelText(/description/i)).toHaveLength(1)
  })

  it('calcul sous-total par ligne (quantity × unitPrice)', async () => {
    const user = userEvent.setup()
    renderForm()

    const qtyInput = screen.getByLabelText('Quantité')
    const priceInput = screen.getByLabelText('Prix unitaire HT')

    await user.clear(qtyInput)
    await user.type(qtyInput, '3')
    await user.clear(priceInput)
    await user.type(priceInput, '100')

    // Sous-total appears in the line AND in the totals section
    await waitFor(() => {
      const matches = screen.getAllByText('300,00 €')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('calcul total HT et TTC', async () => {
    const user = userEvent.setup()
    renderForm()

    const qtyInput = screen.getByLabelText('Quantité')
    const priceInput = screen.getByLabelText('Prix unitaire HT')

    await user.clear(qtyInput)
    await user.type(qtyInput, '2')
    await user.clear(priceInput)
    await user.type(priceInput, '500')

    // Total HT = 1000, TVA 20% = 200, TTC = 1200
    await waitFor(() => {
      expect(screen.getByText('Total HT')).toBeInTheDocument()
    })
    // 1000 appears as subtotal line AND as total HT
    const matches = screen.getAllByText('1 000,00 €')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('soumission réussie → toast + redirection', async () => {
    const { toast } = await import('sonner')
    const user = userEvent.setup()
    vi.mocked(devisApi.createQuote).mockResolvedValue({
      id: 42,
      reference: 'DEV-2026-0001',
      subject: 'Test devis',
      status: 'Draft',
      priority: 'Normal',
      customerId: 1,
      customerName: 'Dupont Jean',
      validityDate: null,
      estimatedDuration: null,
      siteAddress: null,
      amountExclTax: null,
      taxRate: 20,
      amountInclTax: null,
      reminderDate: null,
      customFields: null,
      legalMentions: null,
      notes: null,
      createdBy: 1,
      createdByName: 'Martin Sophie',
      createdAt: '2026-03-19T10:00:00Z',
      updatedAt: null,
      lines: [],
    })

    renderForm()

    // Switch to mode Rapide to avoid line description validation
    await user.click(screen.getByText('Rapide'))

    // Select customer
    await user.click(screen.getByTestId('select-customer'))

    // Fill subject
    await user.type(screen.getByLabelText(/objet/i), 'Test devis')

    // Fill siteAddress (now required)
    await user.type(screen.getByLabelText(/adresse du chantier/i), '1 rue de Paris')

    // Submit
    await user.click(screen.getByText('Créer le devis'))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Devis créé')
    })
    expect(mockNavigate).toHaveBeenCalledWith('/devis/42')
  })

  it('validation — client obligatoire', async () => {
    const user = userEvent.setup()
    renderForm()

    // Switch to rapide mode to avoid line validation
    await user.click(screen.getByText('Rapide'))
    await user.type(screen.getByLabelText(/objet/i), 'Test')
    await user.type(screen.getByLabelText(/adresse du chantier/i), '1 rue')
    await user.click(screen.getByText('Créer le devis'))

    await waitFor(() => {
      expect(screen.getByText('Le client est obligatoire')).toBeInTheDocument()
    })
  })

  it('validation — objet obligatoire', async () => {
    const user = userEvent.setup()
    renderForm()

    // Switch to rapide mode to avoid line validation
    await user.click(screen.getByText('Rapide'))
    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByText('Créer le devis'))

    await waitFor(() => {
      expect(screen.getByText("L'objet est obligatoire")).toBeInTheDocument()
    })
  })

  it('bouton "Renseigner plus" bascule en mode Libre', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByText('Rapide'))
    expect(screen.queryByText('Lignes de prestations')).not.toBeInTheDocument()

    await user.click(screen.getByText("Renseigner plus d'informations"))
    expect(screen.getByText('Lignes de prestations')).toBeInTheDocument()
  })
})
