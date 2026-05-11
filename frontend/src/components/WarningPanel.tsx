import type { WarningResult } from '../types'
import { STATUS_CLASS } from '../constants'

interface WarningPanelProps {
  warning: WarningResult
  compact?: boolean
}

function boolLabel(value: boolean | null): string {
  if (value === null) return 'Unknown'
  return value ? 'Yes' : 'No'
}

export default function WarningPanel({ warning, compact = false }: WarningPanelProps) {
  if (compact) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden">
        <div className="bg-primary/90 px-3 py-1.5 flex items-center justify-between">
          <span className="text-label-bold text-on-primary font-black uppercase tracking-wider">Gov't Warning</span>
          <span className={STATUS_CLASS[warning.status]}>
            {warning.status.replace('_', ' ')}
          </span>
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
        </div>
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
