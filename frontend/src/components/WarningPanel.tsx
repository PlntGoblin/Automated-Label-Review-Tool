import type { WarningResult } from '../types'
import { STATUS_CLASS } from '../constants'

interface WarningPanelProps {
  warning: WarningResult
}

function boolLabel(value: boolean | null): string {
  if (value === null) return 'Unknown'
  return value ? 'Yes' : 'No'
}

export default function WarningPanel({ warning }: WarningPanelProps) {
  return (
    <div className="warning-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Government Warning</h3>
        <span className={`status-badge ${STATUS_CLASS[warning.status]}`}>
          {warning.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <strong>Extracted text:</strong>
        <div className="warning-panel__text">
          {warning.extracted_text ?? 'Not found on label'}
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <strong>Required text (27 CFR 16.21):</strong>
        <div className="warning-panel__text">
          {warning.canonical_text}
        </div>
      </div>

      <div className="warning-panel__props">
        <span>All caps: {boolLabel(warning.is_all_caps)}</span>
        <span>Bold: {boolLabel(warning.is_bold)}</span>
        <span>Continuous: {boolLabel(warning.is_continuous_paragraph)}</span>
      </div>

      {warning.region_crop ? (
        <div style={{ marginTop: '0.75rem' }}>
          <strong>Region crop:</strong>
          <div style={{ marginTop: '0.25rem' }}>
            <img
              src={warning.region_crop}
              alt="Government warning region crop"
              style={{ maxWidth: '100%', border: '1px solid #dfe1e2', borderRadius: '2px' }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
