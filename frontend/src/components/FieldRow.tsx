import type { FieldResult } from '../types'
import { FIELD_LABELS, STATUS_COLOR } from '../constants'

interface FieldRowProps {
  name: string
  result: FieldResult
}

export default function FieldRow({ name, result }: FieldRowProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden">
      {/* Field title */}
      <div className="bg-primary/90 px-3 py-1.5 flex items-center justify-between">
        <span className="text-label-bold text-on-primary font-black uppercase tracking-wider">
          {FIELD_LABELS[name] ?? name}
        </span>
        <span className={`text-xs font-black px-2 py-0.5 uppercase tracking-widest ${STATUS_COLOR[result.status]}`}>
          {result.status.replace('_', ' ')}
        </span>
      </div>

      {/* Values */}
      <div className="px-3 py-2 space-y-1">
        <p className="text-body-md text-on-surface">
          <span className="text-label-sm text-secondary uppercase tracking-wider mr-1">Label:</span>
          {result.extracted_value ?? <em className="text-secondary">Not found</em>}
        </p>
        <p className="text-body-md text-on-surface">
          <span className="text-label-sm text-secondary uppercase tracking-wider mr-1">Application:</span>
          {result.application_value}
        </p>
        {result.note && (
          <p className="text-label-sm text-error mt-1">{result.note}</p>
        )}
      </div>
    </div>
  )
}
