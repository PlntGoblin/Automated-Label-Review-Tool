import type { VerificationResult } from '../types'
import FieldRow from './FieldRow'
import SummaryBar from './SummaryBar'
import WarningPanel from './WarningPanel'

interface ReviewChecklistProps {
  result: VerificationResult
}

const FIELD_ORDER = [
  'brand_name',
  'class_or_type',
  'alcohol_content',
  'net_contents',
  'bottler_name_and_address',
  'country_of_origin',
]

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
        <div role="table" aria-label="Field comparison results">
          {FIELD_ORDER.map((name) => {
            const field = result.fields[name]
            return field ? <FieldRow key={name} name={name} result={field} /> : null
          })}
        </div>
      </div>

      <WarningPanel warning={result.government_warning} />
    </section>
  )
}
