import { Alert } from '@trussworks/react-uswds'
import type { VerificationSummary } from '../types'

interface SummaryBarProps {
  summary: VerificationSummary
  manualReviewRequired: boolean
  errorReason: string | null
}

export default function SummaryBar({ summary, manualReviewRequired, errorReason }: SummaryBarProps) {
  return (
    <div>
      {manualReviewRequired && (
        <Alert type="warning" headingLevel="h3" heading="Manual Review Required" slim>
          {errorReason ?? 'Vision extraction failed. All fields require manual review.'}
        </Alert>
      )}
      {summary.requires_full_manual_review && !manualReviewRequired && (
        <Alert type="warning" headingLevel="h3" heading="Low Confidence" slim>
          Multiple fields could not be read. Full manual review recommended.
        </Alert>
      )}
      <div className="summary-bar" role="status" aria-label="Verification summary">
        <div className="summary-stat">
          <div className="summary-stat__count" style={{ color: '#216e1f' }}>{summary.pass_count}</div>
          <div className="summary-stat__label">Passed</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat__count" style={{ color: '#b50909' }}>{summary.flag_count}</div>
          <div className="summary-stat__label">Flagged</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat__count" style={{ color: '#8b6914' }}>{summary.low_confidence_count}</div>
          <div className="summary-stat__label">Low Confidence</div>
        </div>
      </div>
    </div>
  )
}
