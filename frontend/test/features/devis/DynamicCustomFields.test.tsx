import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import { DynamicCustomFields } from '@/features/devis/DynamicCustomFields'
import type { CustomFieldResponse } from '@/features/admin/types'
import { renderWithProviders } from '../../test-utils'

const mockFields: CustomFieldResponse[] = [
  {
    id: 1,
    label: 'Champ texte',
    fieldType: 'Text',
    obligationLevel: 'RequiredAtCreation',
    appliesToQuotes: true,
    appliesToSites: false,
    displayOrderQuotes: 1,
    displayOrderSites: null,
    createdAt: '2026-01-01',
  },
  {
    id: 2,
    label: 'Champ nombre',
    fieldType: 'Number',
    obligationLevel: 'Never',
    appliesToQuotes: true,
    appliesToSites: false,
    displayOrderQuotes: 2,
    displayOrderSites: null,
    createdAt: '2026-01-01',
  },
  {
    id: 3,
    label: 'Choix unique',
    fieldType: 'SingleChoice',
    options: '{"choices":["Option A","Option B"]}',
    obligationLevel: 'RequiredForSiteConversion',
    appliesToQuotes: true,
    appliesToSites: false,
    displayOrderQuotes: 3,
    displayOrderSites: null,
    createdAt: '2026-01-01',
  },
  {
    id: 4,
    label: 'Choix multiple',
    fieldType: 'MultipleChoice',
    options: '{"choices":["X","Y","Z"]}',
    obligationLevel: 'Never',
    appliesToQuotes: true,
    appliesToSites: false,
    displayOrderQuotes: 4,
    displayOrderSites: null,
    createdAt: '2026-01-01',
  },
  {
    id: 5,
    label: 'Champ date',
    fieldType: 'Date',
    obligationLevel: 'Never',
    appliesToQuotes: true,
    appliesToSites: false,
    displayOrderQuotes: 5,
    displayOrderSites: null,
    createdAt: '2026-01-01',
  },
]

function Wrapper({ mode, definitions }: { mode: 'rapide' | 'libre' | 'complet'; definitions: CustomFieldResponse[] }) {
  const form = useForm({ defaultValues: { customFields: {} } })
  return (
    <FormProvider {...form}>
      <DynamicCustomFields definitions={definitions} control={form.control} mode={mode} />
    </FormProvider>
  )
}

describe('DynamicCustomFields', () => {
  it('mode rapide — aucun champ custom affiché', () => {
    renderWithProviders(<Wrapper mode="rapide" definitions={mockFields} />)
    expect(screen.queryByText('Champs personnalisés')).not.toBeInTheDocument()
  })

  it('mode libre — seuls RequiredAtCreation affichés', () => {
    renderWithProviders(<Wrapper mode="libre" definitions={mockFields} />)
    expect(screen.getByText('Champ texte')).toBeInTheDocument()
    expect(screen.queryByText('Champ nombre')).not.toBeInTheDocument()
    expect(screen.queryByText('Choix unique')).not.toBeInTheDocument()
  })

  it('mode complet — tous les champs affichés', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={mockFields} />)
    expect(screen.getByText('Champ texte')).toBeInTheDocument()
    expect(screen.getByText('Champ nombre')).toBeInTheDocument()
    expect(screen.getByText('Choix unique')).toBeInTheDocument()
    expect(screen.getByText('Choix multiple')).toBeInTheDocument()
    expect(screen.getByText('Champ date')).toBeInTheDocument()
  })

  it('rendu type Text → Input', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[0]]} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('rendu type Number → Input number', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[1]]} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
  })

  it('rendu type Date → Input date', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[4]]} />)
    const input = document.querySelector('input[type="date"]')
    expect(input).toBeInTheDocument()
  })

  it('rendu type SingleChoice → Select avec options', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[2]]} />)
    expect(screen.getByText('Choix unique')).toBeInTheDocument()
    // Select trigger is rendered
    expect(screen.getByText('Sélectionner...')).toBeInTheDocument()
  })

  it('rendu type MultipleChoice → Checkboxes', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[3]]} />)
    expect(screen.getByText('X')).toBeInTheDocument()
    expect(screen.getByText('Y')).toBeInTheDocument()
    expect(screen.getByText('Z')).toBeInTheDocument()
  })

  it('obligation RequiredAtCreation → indicateur obligatoire', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[0]]} />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('obligation Never → mention (optionnel)', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[1]]} />)
    expect(screen.getByText('(optionnel)')).toBeInTheDocument()
  })

  it('obligation RequiredForSiteConversion → mention spécifique', () => {
    renderWithProviders(<Wrapper mode="complet" definitions={[mockFields[2]]} />)
    expect(screen.getByText('(requis pour créer un chantier)')).toBeInTheDocument()
  })
})
