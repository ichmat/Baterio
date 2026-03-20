import { Pencil, Send, Check, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PipelineStep {
  key: string
  label: string
  icon: LucideIcon
}

export interface PipelineConfig {
  linearSteps: PipelineStep[]
  terminalSteps: Record<string, PipelineStep>
}

const QUOTE_PIPELINE: PipelineConfig = {
  linearSteps: [
    { key: 'Draft', label: 'Brouillon', icon: Pencil },
    { key: 'Sent', label: 'Envoyé', icon: Send },
  ],
  terminalSteps: {
    Accepted: { key: 'Accepted', label: 'Validé', icon: Check },
    Refused: { key: 'Refused', label: 'Refusé', icon: X },
  },
}

type StepState = 'past' | 'active' | 'future'

function getStepState(stepKey: string, currentStatus: string, linearKeys: string[]): StepState {
  const currentLinearIndex = linearKeys.indexOf(currentStatus)
  const stepLinearIndex = linearKeys.indexOf(stepKey)

  // Terminal statuses (not in linear list)
  if (stepLinearIndex === -1) {
    if (currentStatus === stepKey) return 'active'
    return 'future'
  }

  // Linear steps
  if (currentLinearIndex === -1) {
    // Current is terminal — all linear steps are past
    return 'past'
  }

  if (stepLinearIndex < currentLinearIndex) return 'past'
  if (stepLinearIndex === currentLinearIndex) return 'active'
  return 'future'
}

function getStepColor(state: StepState, stepKey: string): string {
  if (state === 'past') return 'text-green-600 bg-green-100 border-green-400'
  if (state === 'active') {
    if (stepKey === 'Refused') return 'text-red-600 bg-red-100 border-red-400'
    return 'text-blue-600 bg-blue-100 border-blue-400'
  }
  return 'text-gray-500 bg-gray-100 border-gray-300'
}

function getSegmentColor(state: StepState): string {
  if (state === 'past') return 'bg-green-400'
  return 'bg-gray-300'
}

interface StatusPipelineProps {
  currentStatus: string
  config?: PipelineConfig
}

export function StatusPipeline({ currentStatus, config = QUOTE_PIPELINE }: StatusPipelineProps) {
  const { linearSteps, terminalSteps } = config
  const linearKeys = linearSteps.map((s) => s.key)
  const terminalEntries = Object.values(terminalSteps)

  const stepStates = new Map<string, StepState>()
  for (const step of [...linearSteps, ...terminalEntries]) {
    stepStates.set(step.key, getStepState(step.key, currentStatus, linearKeys))
  }

  // Aria values
  const allSteps = [...linearSteps, ...terminalEntries]
  const activeIndex = allSteps.findIndex((s) => s.key === currentStatus)
  const activeStep = allSteps.find((s) => s.key === currentStatus)

  return (
    <div
      role="progressbar"
      aria-valuenow={activeIndex >= 0 ? activeIndex : 0}
      aria-valuemin={0}
      aria-valuemax={allSteps.length - 1}
      aria-valuetext={activeStep?.label ?? allSteps[0]?.label ?? ''}
      className="flex items-center"
    >
      {/* Linear steps with segments */}
      {linearSteps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          {i > 0 && <Segment state={stepStates.get(step.key) === 'past' || stepStates.get(step.key) === 'active' ? 'past' : 'future'} />}
          <StepNode step={step} state={stepStates.get(step.key)!} />
        </div>
      ))}

      {/* Fork: terminal branches */}
      {terminalEntries.length > 0 && (
        <div className="flex flex-col gap-1 ml-1">
          {terminalEntries.map((step) => (
            <div key={step.key} className="flex items-center">
              <Segment state={stepStates.get(step.key) === 'active' ? 'past' : 'future'} short />
              <StepNode step={step} state={stepStates.get(step.key)!} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StepNode({ step, state }: { step: PipelineStep; state: StepState }) {
  const Icon = step.icon
  const isActive = state === 'active'

  return (
    <div
      data-testid={`step-${step.key}`}
      className={cn('flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors', getStepColor(state, step.key))}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {/* Desktop: always show text. Mobile: text only on active step */}
      <span className={cn('hidden sm:inline', isActive && 'inline')}>
        {step.label}
      </span>
    </div>
  )
}

function Segment({ state, short }: { state: StepState; short?: boolean }) {
  return (
    <div className={cn('h-0.5 rounded-full', getSegmentColor(state), short ? 'w-4' : 'w-6')} />
  )
}
