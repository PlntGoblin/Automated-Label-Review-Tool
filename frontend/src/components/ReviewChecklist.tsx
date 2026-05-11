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
        <div
          role="list"
          aria-label="Field comparison results"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FIELD_ORDER.map((name) => {
            const field = result.fields[name]
            return field ? (
              <div key={name} role="listitem">
                <FieldRow name={name} result={field} />
              </div>
            ) : null
          })}
        </div>
      </div>

      <WarningPanel warning={result.government_warning} />
    </section>
  )
}
