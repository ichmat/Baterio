import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { CreateChantierForm } from '@/features/chantiers/CreateChantierForm'
import * as sitesApi from '@/features/chantiers/api'
import * as devisApi from '@/features/devis/api'
import * as adminApi from '@/features/admin/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
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
  CustomerAutocomplete: ({ onSelect }: any) => (
    <div data-testid="customer-autocomplete">
      <button
        data-testid="select-customer"
        onClick={() =>
          onSelect({ id: 1, lastName: 'Dupont', firstName: 'Jean', telephone: null, email: null, quoteCount: 0, siteCount: 0 })
        }
      >
        Sélectionner client
      </button>
    </div>
  ),
}))

// Mock DynamicCustomFields
vi.mock('@/features/devis/DynamicCustomFields', () => ({
  DynamicCustomFields: () => <div data-testid="dynamic-custom-fields" />,
}))

const mockNavigate = vi.fn()
let mockSearchParams = new URLSearchParams()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useNavigate: () => mockNavigate, useSearchParams: () => [mockSearchParams, vi.fn()] }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSearchParams = new URLSearchParams()
  vi.mocked(adminApi.getCustomFields).mockResolvedValue([])
})

function renderForm() {
  return renderWithProviders(
    <MemoryRouter>
      <CreateChantierForm />
    </MemoryRouter>,
  )
}

describe('CreateChantierForm', () => {
  it('affiche le titre "Nouveau chantier"', () => {
    renderForm()
    expect(screen.getByText('Nouveau chantier')).toBeInTheDocument()
  })

  it('mode indépendant — formulaire vide avec CustomerAutocomplete', () => {
    renderForm()
    expect(screen.getByTestId('customer-autocomplete')).toBeInTheDocument()
    expect(screen.getByLabelText(/objet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/adresse du chantier/i)).toBeInTheDocument()
  })

  it('soumission valide — appel API + toast + navigation', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesApi.createSite).mockResolvedValue({
      id: 42,
      reference: 'CH-2026-001',
      subject: 'Peinture salon',
      status: 'Planned',
      customerId: 1,
      customerName: 'Dupont Jean',
      quoteId: null,
      quoteReference: null,
      siteAddress: '5 rue de la Paix',
      startDate: null,
      endDate: null,
      customFields: null,
      notes: null,
      createdBy: 1,
      createdByName: 'Chef Test',
      createdAt: '2026-03-31T10:00:00Z',
      updatedAt: null,
    })

    renderForm()

    // Select customer
    await user.click(screen.getByTestId('select-customer'))

    // Fill subject
    const subjectInput = screen.getByLabelText(/objet/i)
    await user.type(subjectInput, 'Peinture salon')

    // Fill address
    const addressInput = screen.getByLabelText(/adresse du chantier/i)
    await user.type(addressInput, '5 rue de la Paix')

    // Submit
    await user.click(screen.getByRole('button', { name: /créer le chantier/i }))

    await waitFor(() => {
      expect(sitesApi.createSite).toHaveBeenCalled()
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Chantier créé')
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/42')
  })

  it('validation — subject vide affiche erreur', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByTestId('select-customer'))
    await user.type(screen.getByLabelText(/adresse du chantier/i), 'Adresse test')
    await user.click(screen.getByRole('button', { name: /créer le chantier/i }))

    await waitFor(() => {
      expect(screen.getByText(/l'objet est obligatoire/i)).toBeInTheDocument()
    })
  })

  it('validation — siteAddress vide affiche erreur', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByTestId('select-customer'))
    await user.type(screen.getByLabelText(/objet/i), 'Objet test')
    await user.click(screen.getByRole('button', { name: /créer le chantier/i }))

    await waitFor(() => {
      expect(screen.getByText(/l'adresse est obligatoire/i)).toBeInTheDocument()
    })
  })

  it('bouton Annuler navigue en arrière', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  // --- Mode devis (quoteId dans URL) ---

  it('mode devis — client affiché en readonly, champs pré-remplis', async () => {
    mockSearchParams = new URLSearchParams('quoteId=5')
    vi.mocked(devisApi.getQuoteById).mockResolvedValue({
      id: 5,
      reference: 'DEV-2026-005',
      subject: 'Rénovation cuisine',
      status: 'Accepted',
      priority: 'Normal',
      customerId: 10,
      customerName: 'Dupont Jean',
      validityDate: null,
      estimatedDuration: null,
      siteAddress: '12 rue de la Paix',
      amountExclTax: null,
      taxRate: null,
      amountInclTax: null,
      reminderDate: null,
      customFields: null,
      legalMentions: null,
      notes: null,
      createdBy: 1,
      createdByName: 'Chef Test',
      createdAt: '2026-03-31T10:00:00Z',
      updatedAt: null,
      lines: [],
    })

    renderForm()

    await waitFor(() => {
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    // Client is shown as text, not as autocomplete
    expect(screen.queryByTestId('customer-autocomplete')).not.toBeInTheDocument()

    // Subject and address pre-filled
    expect(screen.getByLabelText(/objet/i)).toHaveValue('Rénovation cuisine')
    expect(screen.getByLabelText(/adresse du chantier/i)).toHaveValue('12 rue de la Paix')
  })

  it('mode devis — soumission inclut quoteId', async () => {
    const user = userEvent.setup()
    mockSearchParams = new URLSearchParams('quoteId=5')
    vi.mocked(devisApi.getQuoteById).mockResolvedValue({
      id: 5,
      reference: 'DEV-2026-005',
      subject: 'Rénovation cuisine',
      status: 'Accepted',
      priority: 'Normal',
      customerId: 10,
      customerName: 'Dupont Jean',
      validityDate: null,
      estimatedDuration: null,
      siteAddress: '12 rue de la Paix',
      amountExclTax: null,
      taxRate: null,
      amountInclTax: null,
      reminderDate: null,
      customFields: null,
      legalMentions: null,
      notes: null,
      createdBy: 1,
      createdByName: 'Chef Test',
      createdAt: '2026-03-31T10:00:00Z',
      updatedAt: null,
      lines: [],
    })
    vi.mocked(sitesApi.createSite).mockResolvedValue({
      id: 99,
      reference: 'CH-2026-001',
      subject: 'Rénovation cuisine',
      status: 'Planned',
      customerId: 10,
      customerName: 'Dupont Jean',
      quoteId: 5,
      quoteReference: 'DEV-2026-005',
      siteAddress: '12 rue de la Paix',
      startDate: null,
      endDate: null,
      customFields: null,
      notes: null,
      createdBy: 1,
      createdByName: 'Chef Test',
      createdAt: '2026-03-31T10:00:00Z',
      updatedAt: null,
    })

    renderForm()

    await waitFor(() => {
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /créer le chantier/i }))

    await waitFor(() => {
      expect(sitesApi.createSite).toHaveBeenCalled()
    })

    const callArgs = vi.mocked(sitesApi.createSite).mock.calls[0][0]
    expect(callArgs.quoteId).toBe(5)
    expect(callArgs.customerId).toBe(10)
  })

  // --- RequiredForSiteConversion ---

  it('RequiredForSiteConversion — champ manquant affiche message erreur', async () => {
    const user = userEvent.setup()
    vi.mocked(adminApi.getCustomFields).mockResolvedValue([
      {
        id: 42,
        label: 'Type de sol',
        fieldType: 'Text' as any,
        obligationLevel: 'RequiredForSiteConversion' as any,
        appliesToQuotes: true,
        appliesToSites: true,
        displayOrderQuotes: null,
        displayOrderSites: 1,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])

    renderForm()

    // Select customer
    await user.click(screen.getByTestId('select-customer'))

    // Fill required fields
    await user.type(screen.getByLabelText(/objet/i), 'Objet test')
    await user.type(screen.getByLabelText(/adresse du chantier/i), 'Adresse test')

    // Submit WITHOUT filling the required custom field
    await user.click(screen.getByRole('button', { name: /créer le chantier/i }))

    await waitFor(() => {
      expect(screen.getByText(/il manque type de sol pour créer le chantier/i)).toBeInTheDocument()
    })
  })
})
