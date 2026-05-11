import type { VerificationResult } from '../types'
import { FIELD_ORDER } from '../constants'
import FieldRow from './FieldRow'
import SummaryBar from './SummaryBar'
import WarningPanel from './WarningPanel'

interface ReviewChecklistProps {
  result: VerificationResult
}

export default function ReviewChecklist({ result }: ReviewChecklistProps) {
  return (
    <section aria-label="Verification results">
      <h2 className="usa-heading" style={{ marginBottom: '1rem' }}>Verification Results</h2>

      <SummaryBar
        summary={result.summary}
        manualReviewRequired={result.manual_review_required}
        errorReason={result.error_reason}
      />

      <div style={{ background: '#fff', border: '1px solid #dfe1e2', borderRadius: '4px', padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Field Comparison</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Field comparison results">
          {FIELD_ORDER.map((name) => {
            const field = result.fields[name]
            return field ? <FieldRow key={name} name={name} result={field} /> : null
          })}
        </ul>
      </div>

      <WarningPanel warning={result.government_warning} />
    </section>
  )
}
