import type { FieldResult } from '../types'
import { FIELD_LABELS, STATUS_CLASS } from '../constants'

interface FieldRowProps {
  name: string
  result: FieldResult
}

export default function FieldRow({ name, result }: FieldRowProps) {
  return (
    <li className="field-row">
      <div className="field-row__label">
        {FIELD_LABELS[name] ?? name}
      </div>
      <div className="field-row__values">
        <p><strong>Label:</strong> {result.extracted_value ?? <em>Not found</em>}</p>
        <p><strong>Application:</strong> {result.application_value}</p>
        {result.note && (
          <p style={{ color: '#b50909', fontSize: '0.8125rem' }}>{result.note}</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <span className={`status-badge ${STATUS_CLASS[result.status]}`}>
          {result.status.replace('_', ' ')}
        </span>
        {result.region_crop ? (
          <img
            className="field-row__crop"
            src={result.region_crop}
            alt={`Cropped region for ${FIELD_LABELS[name] ?? name}`}
          />
        ) : (
          <div className="field-row__crop-placeholder">No crop</div>
        )}
      </div>
    </li>
  )
}
