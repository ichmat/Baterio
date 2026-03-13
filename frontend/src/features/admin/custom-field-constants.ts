export const FIELD_TYPE_LABELS: Record<string, string> = {
  Text: 'Texte libre',
  Number: 'Nombre',
  SingleChoice: 'Choix unique',
  MultipleChoice: 'Choix multiple',
  Date: 'Date',
}

export const OBLIGATION_LABELS: Record<string, string> = {
  Never: 'Jamais obligatoire',
  RequiredAtCreation: 'Obligatoire à la création',
  RequiredForSiteConversion: 'Obligatoire pour passage en chantier',
}

export const FIELD_TYPES = Object.entries(FIELD_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }) as const,
)

export const OBLIGATION_LEVELS = Object.entries(OBLIGATION_LABELS).map(
  ([value, label]) => ({ value, label }) as const,
)
