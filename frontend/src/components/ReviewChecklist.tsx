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
    <section aria-label="Verification results" className="space-y-margin-md">
      <h2 className="text-headline-md font-semibold text-primary">Verification Results</h2>
      <SummaryBar
        summary={result.summary}
        manualReviewRequired={result.manual_review_required}
        errorReason={result.error_reason}
      />

      <div className="bg-surface-container-lowest border border-outline-variant p-margin-md">
        <h3 className="text-headline-sm font-semibold text-primary mb-4">Field Comparison</h3>
        <ul aria-label="Field comparison results" className="divide-y divide-outline-variant">
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
