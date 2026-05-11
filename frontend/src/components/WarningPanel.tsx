import { useState } from 'react'
import type { FieldOverride, WarningResult } from '../types'
import { STATUS_CLASS } from '../constants'

interface WarningPanelProps {
  warning: WarningResult
  compact?: boolean
  override?: FieldOverride
  onOverride?: (initials: string, reason: string | null) => void
}

function boolLabel(value: boolean | null): string {
  if (value === null) return 'Unknown'
  return value ? 'Yes' : 'No'
}

export default function WarningPanel({ warning, compact = false, override, onOverride }: WarningPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [initials, setInitials] = useState('')
  const [reason, setReason] = useState('')

  const canOverride = (warning.status === 'FLAG' || warning.status === 'LOW_CONFIDENCE') && !override && !!onOverride
  const needsReason = warning.status === 'FLAG'

  const handleSubmit = () => {
    if (!initials.trim() || !onOverride) return
    if (needsReason && !reason.trim()) return
    onOverride(initials.trim().toUpperCase(), needsReason ? reason.trim() : null)
    setShowForm(false)
  }

  if (compact) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden">
        <div className="bg-primary/90 px-3 py-1.5 flex items-center justify-between">
          <span className="text-label-bold text-on-primary font-black uppercase tracking-wider">Gov't Warning</span>
          {override ? (
            <span className="text-xs font-black px-2 py-0.5 uppercase tracking-widest bg-green-100 text-green-800 ring-1 ring-green-400">PASS</span>
          ) : (
            <span className={STATUS_CLASS[warning.status]}>{warning.status.replace('_', ' ')}</span>
          )}
        </div>
        <div className="px-3 py-2 space-y-1">
          <p className="text-body-md text-on-surface">
            <span className="text-label-sm text-secondary uppercase tracking-wider mr-1">Label:</span>
            {warning.extracted_text ?? <em className="text-secondary">Not found</em>}
          </p>
          <div className="flex gap-3 flex-wrap pt-1">
            <span className="text-label-sm text-secondary">All caps: {boolLabel(warning.is_all_caps)}</span>
            <span className="text-label-sm text-secondary">Bold: {boolLabel(warning.is_bold)}</span>
            <span className="text-label-sm text-secondary">Continuous: {boolLabel(warning.is_continuous_paragraph)}</span>
          </div>
          {warning.note && !override && (
            <p className="text-label-sm text-error mt-1">{warning.note}</p>
          )}
          {override && (
            <p className="text-label-sm text-green-700 mt-1">
              Manually cleared by <strong>{override.initials}</strong>
              {override.reason && ` — ${override.reason}`}
            </p>
          )}
        </div>

        {canOverride && !showForm && (
          <div className="px-3 pb-2">
            <button type="button" onClick={() => setShowForm(true)} className="text-xs text-secondary hover:text-primary underline underline-offset-2 transition-colors">
              Override &amp; clear
            </button>
          </div>
        )}
        {showForm && (
          <div className="px-3 pb-3 pt-1 border-t border-outline-variant space-y-2 bg-surface-container">
            <p className="text-xs text-secondary uppercase tracking-wider">Reviewer sign-off</p>
            <input type="text" maxLength={4} placeholder="Initials" value={initials} onChange={(e) => setInitials(e.target.value)}
              className="w-full border border-outline-variant px-2 py-1 text-sm uppercase focus:outline-none focus:border-primary" />
            {needsReason && (
              <textarea rows={2} placeholder="Reason for override (required)" value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full border border-outline-variant px-2 py-1 text-sm resize-none focus:outline-none focus:border-primary" />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={handleSubmit} disabled={!initials.trim() || (needsReason && !reason.trim())}
                className="bg-primary text-on-primary text-xs font-bold px-3 py-1 uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                Confirm
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-secondary hover:text-primary transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-margin-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-headline-sm font-semibold text-primary">Government Warning</h3>
        <span className={STATUS_CLASS[warning.status]}>
          {warning.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-label-bold text-secondary uppercase tracking-wider mb-1">Extracted text</p>
          <p className="font-mono text-body-md text-on-surface bg-surface-container px-3 py-2 border border-outline-variant">
            {warning.extracted_text ?? <em className="text-secondary not-italic">Not found on label</em>}
          </p>
        </div>

        <div>
          <p className="text-label-bold text-secondary uppercase tracking-wider mb-1">Required text (27 CFR 16.21)</p>
          <p className="font-mono text-body-md text-on-surface bg-surface-container px-3 py-2 border border-outline-variant">
            {warning.canonical_text}
          </p>
        </div>

        <div className="flex gap-margin-md flex-wrap">
          <span className="text-label-sm text-secondary">All caps: {boolLabel(warning.is_all_caps)}</span>
          <span className="text-label-sm text-secondary">Bold: {boolLabel(warning.is_bold)}</span>
          <span className="text-label-sm text-secondary">Continuous: {boolLabel(warning.is_continuous_paragraph)}</span>
        </div>
      </div>

      {warning.region_crop && (
        <div className="mt-4">
          <p className="text-label-bold text-secondary uppercase tracking-wider mb-2">Region crop</p>
          <img
            src={warning.region_crop}
            alt="Government warning region crop"
            className="max-w-full border border-outline-variant"
          />
        </div>
      )}
    </div>
  )
}
