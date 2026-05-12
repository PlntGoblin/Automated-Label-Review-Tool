import { useEffect, useState } from 'react'

interface Step {
  icon: string
  label: string
  sublabel: string
  doneAt: number
}

const SINGLE_STEPS: Step[] = [
  { icon: 'upload',         label: 'Uploading image',            sublabel: 'Sending label to server',              doneAt: 600  },
  { icon: 'image_search',   label: 'Running AI vision',          sublabel: 'Extracting fields from label',         doneAt: 4500 },
  { icon: 'fact_check',     label: 'Comparing application data', sublabel: 'Checking each field against COLA app', doneAt: 5800 },
  { icon: 'task_alt',       label: 'Finalizing results',         sublabel: 'Building verification report',         doneAt: 6800 },
]

interface AnalysisProgressProps {
  mode: 'single' | 'batch'
}

// Compute a 5-pointed star path centered at (cx, cy)
function starPath(cx: number, cy: number, R = 13, r = 5.5) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * (Math.PI / 180)
    const rad = i % 2 === 0 ? R : r
    pts.push(`${(cx + rad * Math.cos(angle)).toFixed(2)},${(cy + rad * Math.sin(angle)).toFixed(2)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

// Pentagon positions (counterclockwise from top), orbit radius 38, center 60,58
const ORBIT = 38
const CX = 60
const CY = 58
const STAR_POSITIONS = [0, 1, 2, 3, 4].map((i) => {
  const angle = (-90 - i * 72) * (Math.PI / 180)
  return {
    cx: +(CX + ORBIT * Math.cos(angle)).toFixed(2),
    cy: +(CY + ORBIT * Math.sin(angle)).toFixed(2),
  }
})

export default function AnalysisProgress({ mode }: AnalysisProgressProps) {
  const steps = SINGLE_STEPS
  const [doneCount, setDoneCount] = useState(0)

  useEffect(() => {
    setDoneCount(0)
    const timers = steps.map((step, i) =>
      window.setTimeout(() => setDoneCount(i + 1), step.doneAt)
    )
    return () => timers.forEach(clearTimeout)
  }, [mode])

  const activeIndex = Math.min(doneCount, steps.length - 1)

  // Animation: each star has a staggered delay so they light up counterclockwise
  const CYCLE = 2.5 // seconds
  const PER_STAR = CYCLE / 5

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-6 gap-8"
      role="status"
      aria-live="polite"
      aria-label="Analysis in progress"
    >
      <style>{`
        @keyframes starFill {
          0%   { fill: transparent; }
          15%  { fill: #FFD700; filter: drop-shadow(0 0 4px #FFD700); }
          65%  { fill: #FFD700; filter: drop-shadow(0 0 4px #FFD700); }
          85%, 100% { fill: transparent; filter: none; }
        }
      `}</style>

      {/* 5-star formation */}
      <svg viewBox="0 0 120 116" width="140" height="135" aria-hidden="true">
        {STAR_POSITIONS.map((pos, i) => (
          <path
            key={i}
            d={starPath(pos.cx, pos.cy)}
            fill="transparent"
            stroke="#1B2A4A"
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{
              animation: `starFill ${CYCLE}s ease-in-out infinite`,
              animationDelay: `${i * PER_STAR}s`,
            }}
          />
        ))}
      </svg>

      {/* Step list */}
      <ol className="space-y-3 w-full max-w-sm">
        {steps.map((step, i) => {
          const done = i < doneCount
          const active = i === activeIndex && doneCount < steps.length
          return (
            <li key={step.label} className="flex items-center gap-3">
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
