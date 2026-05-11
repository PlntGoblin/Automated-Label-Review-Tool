import type { VerificationResult } from '../types'
import { FIELD_ORDER } from '../constants'
import FieldRow from './FieldRow'
import SummaryBar from './SummaryBar'
import WarningPanel from './WarningPanel'

interface ReviewChecklistProps {
  result: VerificationResult
  labelDataUrl: string | null
}

export default function ReviewChecklist({ result, labelDataUrl }: ReviewChecklistProps) {
  // Gather all fields + gov warning into a unified list, then sort: non-PASS first
  const fieldEntries = FIELD_ORDER.flatMap((name) => {
    const field = result.fields[name]
    return field ? [{ type: 'field' as const, name, field }] : []
  })

  const govWarning = result.government_warning

  // Partition into flagged (FLAG / LOW_CONFIDENCE) and passed
  const flagged = fieldEntries.filter((e) => e.field.status !== 'PASS')
  const passed  = fieldEntries.filter((e) => e.field.status === 'PASS')
  const govIsFlagged = govWarning.status !== 'PASS'

  return (
    <section aria-label="Verification results" className="space-y-margin-md">
      <div className="flex items-center gap-4">
        <h2 className="text-headline-md font-semibold text-primary shrink-0">Verification Results</h2>
        <div className="w-3/4 ml-auto">
          <SummaryBar
            summary={result.summary}
            manualReviewRequired={result.manual_review_required}
            errorReason={result.error_reason}
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant p-margin-md">
        <div className="grid gap-6" style={{ gridTemplateColumns: '58% 42%' }}>

          {/* Left col: field rows, flags on top, passes on bottom */}
          <div role="list" aria-label="Field comparison results" className="space-y-2 text-sm">

            {/* Flagged fields */}
            {flagged.map(({ name, field }) => (
              <div key={name} role="listitem">
                <FieldRow name={name} result={field} />
              </div>
            ))}
            {govIsFlagged && <WarningPanel warning={govWarning} compact />}

            {/* Divider between flagged and passed */}
            {(flagged.length > 0 || govIsFlagged) && passed.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 border-t border-outline-variant" />
                <span className="text-xs text-secondary uppercase tracking-wider">Passed</span>
                <div className="flex-1 border-t border-outline-variant" />
              </div>
            )}

            {/* Passed fields */}
            {passed.map(({ name, field }) => (
              <div key={name} role="listitem">
                <FieldRow name={name} result={field} />
              </div>
            ))}
            {!govIsFlagged && <WarningPanel warning={govWarning} compact />}
          </div>

          {/* Right col: full label image */}
          <div className="flex items-start justify-center bg-surface-container-low border border-outline-variant">
            {labelDataUrl ? (
              <img
                src={labelDataUrl}
                alt="Full label image"
                className="w-full h-full object-contain max-h-[80vh]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-outline">
                <span className="material-symbols-outlined text-[48px]">image_not_supported</span>
                <span className="text-label-sm">No image available</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
