import { useEffect, useState } from 'react'

interface Step {
  icon: string
  label: string
  sublabel: string
  doneAt: number // ms after mount to mark as done
}

const SINGLE_STEPS: Step[] = [
  { icon: 'upload',         label: 'Uploading image',            sublabel: 'Sending label to server',              doneAt: 600  },
  { icon: 'image_search',   label: 'Running AI vision',          sublabel: 'Extracting fields from label',         doneAt: 4500 },
  { icon: 'fact_check',     label: 'Comparing application data', sublabel: 'Checking each field against COLA app', doneAt: 5800 },
  { icon: 'task_alt',       label: 'Finalizing results',         sublabel: 'Building verification report',         doneAt: 6800 },
]

const BATCH_STEPS: Step[] = [
  { icon: 'upload',         label: 'Uploading batch',            sublabel: 'Sending labels to server',             doneAt: 800  },
  { icon: 'image_search',   label: 'Running AI vision',          sublabel: 'Processing each label in parallel',    doneAt: 5000 },
  { icon: 'fact_check',     label: 'Comparing application data', sublabel: 'Checking all fields against COLA apps',doneAt: 6500 },
  { icon: 'task_alt',       label: 'Finalizing results',         sublabel: 'Building batch verification report',   doneAt: 7500 },
]

interface AnalysisProgressProps {
  mode: 'single' | 'batch'
}

export default function AnalysisProgress({ mode }: AnalysisProgressProps) {
  const steps = mode === 'batch' ? BATCH_STEPS : SINGLE_STEPS
  const [doneCount, setDoneCount] = useState(0)

  useEffect(() => {
    setDoneCount(0)
    const timers = steps.map((step, i) =>
      window.setTimeout(() => setDoneCount(i + 1), step.doneAt)
    )
    return () => timers.forEach(clearTimeout)
  }, [mode])

  const activeIndex = Math.min(doneCount, steps.length - 1)

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-6 gap-8"
      role="status"
      aria-live="polite"
      aria-label="Analysis in progress"
    >
      {/* Spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-4 border-outline-variant rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-[22px] text-primary">
            {steps[activeIndex]?.icon}
          </span>
        </div>
      </div>

      {/* Step list */}
      <ol className="space-y-3 w-full max-w-sm">
        {steps.map((step, i) => {
          const done = i < doneCount
          const active = i === activeIndex && doneCount < steps.length
          return (
            <li key={step.label} className="flex items-center gap-3">
              {/* Status icon */}
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  done
                    ? 'bg-green-100 text-green-700'
                    : active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-container text-outline'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {done ? 'check' : active ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
              </span>

              {/* Label */}
              <div className="min-w-0">
                <p className={`text-label-bold uppercase tracking-wider transition-colors ${
                  done ? 'text-secondary line-through' : active ? 'text-primary' : 'text-outline'
                }`}>
                  {step.label}
                </p>
                {active && (
                  <p className="text-label-sm text-secondary mt-0.5">{step.sublabel}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
