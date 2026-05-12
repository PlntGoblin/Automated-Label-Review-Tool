import { useState } from 'react'
import type { FieldOverride, FieldResult } from '../types'
import { FIELD_LABELS, STATUS_COLOR } from '../constants'

interface FieldRowProps {
  name: string
  result: FieldResult
  override?: FieldOverride
  onOverride: (initials: string, reason: string | null) => void
}

const OVERRIDABLE = new Set(['FLAG', 'LOW_CONFIDENCE'])

export default function FieldRow({ name, result, override, onOverride }: FieldRowProps) {
  const [showForm, setShowForm] = useState(false)
  const [initials, setInitials] = useState('')
  const [reason, setReason] = useState('')

  const canOverride = OVERRIDABLE.has(result.status) && !override
  const needsReason = result.status === 'FLAG'

  const handleSubmit = () => {
    if (!initials.trim()) return
    if (needsReason && !reason.trim()) return
    onOverride(initials.trim().toUpperCase(), needsReason ? reason.trim() : null)
    setShowForm(false)
  }

  const cardBg = override
    ? 'bg-green-50 border-green-200'
    : result.status === 'PASS'
      ? 'bg-green-50 border-green-200'
      : result.status === 'FLAG'
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'

  return (
    <div className={`border overflow-hidden ${cardBg}`}>
      {/* Header */}
      <div className="bg-primary/90 px-3 py-1.5 flex items-center justify-between">
        <span className="text-label-bold text-on-primary font-black uppercase tracking-wider">
          {FIELD_LABELS[name] ?? name}
        </span>
        {override ? (
          <span className="text-xs font-black px-2 py-0.5 uppercase tracking-widest bg-green-100 text-green-800 ring-1 ring-green-400">
            PASS
          </span>
        ) : (
          <span className={`text-xs font-black px-2 py-0.5 uppercase tracking-widest ${STATUS_COLOR[result.status]}`}>
            {result.status.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Values */}
      <div className="px-3 py-2 space-y-1">
        <p className="text-body-md text-on-surface flex items-start gap-1">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[11px]">photo_camera</span>
            On Label
          </span>
          {result.extracted_value ?? <em className="text-secondary">Not found</em>}
        </p>
        <p className="text-body-md text-on-surface flex items-start gap-1">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider bg-surface-container text-secondary px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[11px]">description</span>
            Submitted
          </span>
          {result.application_value}
        </p>
        {result.note && !override && (
          <p className="text-label-sm text-error mt-1">{result.note}</p>
        )}
        {override && (
          <p className="text-label-sm text-green-700 mt-1">
            Manually cleared by <strong>{override.initials}</strong>
            {override.reason && ` — ${override.reason}`}
          </p>
        )}
      </div>

      {/* Override controls */}
      {canOverride && !showForm && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-secondary hover:text-primary underline underline-offset-2 transition-colors"
          >
            Override &amp; clear
          </button>
        </div>
      )}

      {showForm && (
        <div className="px-3 pb-3 pt-1 border-t border-outline-variant space-y-2 bg-surface-container">
          <p className="text-xs text-secondary uppercase tracking-wider">Reviewer sign-off</p>
          <input
            type="text"
            maxLength={4}
            placeholder="Initials"
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            className="w-full border border-outline-variant px-2 py-1 text-sm uppercase focus:outline-none focus:border-primary"
          />
          {needsReason && (
            <textarea
              rows={2}
              placeholder="Reason for override (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-outline-variant px-2 py-1 text-sm resize-none focus:outline-none focus:border-primary"
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!initials.trim() || (needsReason && !reason.trim())}
              className="bg-primary text-on-primary text-xs font-bold px-3 py-1 uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
