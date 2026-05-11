import type { VerificationSummary } from '../types'

interface SummaryBarProps {
  summary: VerificationSummary
  manualReviewRequired: boolean
  errorReason: string | null
}

export default function SummaryBar({ summary, manualReviewRequired, errorReason }: SummaryBarProps) {
  return (
    <div className="space-y-3 mb-6">
      {manualReviewRequired && (
        <div className="bg-amber-50 border border-amber-300 px-4 py-3 flex items-start gap-2" role="alert">
          <span className="material-symbols-outlined text-[18px] text-amber-700 mt-0.5 shrink-0">warning</span>
          <div>
            <p className="text-label-bold text-amber-900">Manual Review Required</p>
            <p className="text-label-sm text-amber-800 mt-0.5">
              {errorReason ?? 'Vision extraction failed. All fields require manual review.'}
            </p>
          </div>
        </div>
      )}
      {summary.requires_full_manual_review && !manualReviewRequired && (
        <div className="bg-amber-50 border border-amber-300 px-4 py-3 flex items-start gap-2" role="alert">
          <span className="material-symbols-outlined text-[18px] text-amber-700 mt-0.5 shrink-0">warning</span>
          <div>
            <p className="text-label-bold text-amber-900">Low Confidence</p>
            <p className="text-label-sm text-amber-800 mt-0.5">
              Multiple fields could not be read. Full manual review recommended.
            </p>
          </div>
        </div>
      )}

      <div
        className="grid grid-cols-3 bg-surface-container-lowest border border-outline-variant"
        role="status"
        aria-label="Verification summary"
      >
        <div className="flex flex-col items-center justify-center py-4 px-3 border-r border-outline-variant">
          <span className="text-[28px] font-black text-green-700">{summary.pass_count}</span>
          <span className="text-label-sm text-secondary uppercase tracking-wider mt-1">Passed</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-3 border-r border-outline-variant">
          <span className={`text-[28px] font-black ${summary.flag_count > 0 ? 'text-error' : 'text-on-surface'}`}>
            {summary.flag_count}
          </span>
          <span className="text-label-sm text-secondary uppercase tracking-wider mt-1">Flagged</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4 px-3">
          <span className={`text-[28px] font-black ${summary.low_confidence_count > 0 ? 'text-amber-700' : 'text-on-surface'}`}>
            {summary.low_confidence_count}
          </span>
          <span className="text-label-sm text-secondary uppercase tracking-wider mt-1">Low Confidence</span>
        </div>
      </div>
    </div>
  )
}
