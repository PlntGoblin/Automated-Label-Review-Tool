import type { FieldResult } from '../types'

interface FieldRowProps {
  name: string
  result: FieldResult
}

const STATUS_CLASS: Record<string, string> = {
  PASS: 'status-badge--pass',
  FLAG: 'status-badge--flag',
  LOW_CONFIDENCE: 'status-badge--low-confidence',
}

const FIELD_LABELS: Record<string, string> = {
  brand_name: 'Brand Name',
  class_or_type: 'Class / Type',
  alcohol_content: 'Alcohol Content',
  net_contents: 'Net Contents',
  bottler_name_and_address: 'Bottler Name & Address',
  country_of_origin: 'Country of Origin',
}

export default function FieldRow({ name, result }: FieldRowProps) {
  return (
    <div className="field-row" role="row">
      <div className="field-row__label" role="rowheader">
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
        <span className={`status-badge ${STATUS_CLASS[result.status] ?? ''}`}>
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
    </div>
  )
}
