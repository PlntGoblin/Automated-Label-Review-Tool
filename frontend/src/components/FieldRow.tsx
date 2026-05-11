import type { FieldResult } from '../types'
import { FIELD_LABELS, STATUS_CLASS } from '../constants'

interface FieldRowProps {
  name: string
  result: FieldResult
}

export default function FieldRow({ name, result }: FieldRowProps) {
  return (
    <li className="flex items-start gap-4 py-3 border-b border-outline-variant last:border-0">
      {/* Label name */}
      <div className="w-40 shrink-0">
        <span className="text-label-bold text-secondary uppercase tracking-wider">
          {FIELD_LABELS[name] ?? name}
        </span>
      </div>

      {/* Values */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-body-md text-on-surface">
          <span className="text-label-sm text-secondary uppercase tracking-wider mr-2">Label:</span>
          {result.extracted_value ?? <em className="text-secondary">Not found</em>}
        </p>
        <p className="text-body-md text-on-surface">
          <span className="text-label-sm text-secondary uppercase tracking-wider mr-2">Application:</span>
          {result.application_value}
        </p>
        {result.note && (
          <p className="text-label-sm text-error mt-1">{result.note}</p>
        )}
      </div>

      {/* Status + crop */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={STATUS_CLASS[result.status]}>
          {result.status.replace('_', ' ')}
        </span>
        {result.region_crop ? (
          <img
            src={result.region_crop}
            alt={`Cropped region for ${FIELD_LABELS[name] ?? name}`}
            className="w-24 h-12 object-cover border border-outline-variant"
          />
        ) : (
          <div className="w-24 h-12 bg-surface-container border border-outline-variant flex items-center justify-center">
            <span className="text-label-sm text-secondary">No crop</span>
          </div>
        )}
      </div>
    </li>
  )
}
