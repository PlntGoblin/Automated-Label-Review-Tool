import { useState, useMemo } from 'react'
import type { VerificationResult } from '../types'
import ReviewChecklist from './ReviewChecklist'

interface BatchResultsProps {
  results: VerificationResult[]
  fileNames: string[]
  labelDataUrls: string[][]
}

type SortKey = 'filename' | 'status' | 'flags'

function resultSortValue(r: VerificationResult): number {
  if (r.manual_review_required || r.summary.requires_full_manual_review) return 0
  if (r.summary.flag_count > 0 || r.summary.low_confidence_count > 0) return 1
  return 2
}

export default function BatchResults({ results, fileNames, labelDataUrls }: BatchResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortAsc, setSortAsc] = useState(true)

  const indexed = useMemo(
    () => results.map((r, i) => ({ result: r, fileName: fileNames[i] ?? `Label ${i + 1}`, originalIndex: i })),
    [results, fileNames],
  )

  const sorted = useMemo(() => {
    const items = [...indexed]
    items.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'filename':
          cmp = a.fileName.localeCompare(b.fileName)
          break
        case 'status':
          cmp = resultSortValue(a.result) - resultSortValue(b.result)
          break
        case 'flags':
          cmp = b.result.summary.flag_count - a.result.summary.flag_count
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return items
  }, [indexed, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const toggleExpand = (originalIndex: number) => {
    setExpandedIndex(expandedIndex === originalIndex ? null : originalIndex)
  }

  const totalFlags = results.reduce((sum, r) => sum + r.summary.flag_count, 0)
  const totalPass = results.filter(
    (r) => r.summary.flag_count === 0 && r.summary.low_confidence_count === 0 && !r.manual_review_required,
  ).length

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null
    return (
      <span className="ml-1 text-[10px]">{sortAsc ? '▲' : '▼'}</span>
    )
  }

  const thClass = 'text-left text-label-bold text-secondary uppercase tracking-wider py-3 px-4 bg-surface-container border-b border-outline-variant'
  const tdClass = 'py-3 px-4 text-body-md text-on-surface border-b border-outline-variant'

  return (
    <div className="space-y-margin-md">
      {/* Summary */}
      <div
        className="grid grid-cols-3 bg-surface-container-lowest border border-outline-variant"
        role="status"
        aria-label="Batch summary"
      >
        <div className="flex flex-col items-center justify-center py-4 border-r border-outline-variant">
          <span className="text-[28px] font-black text-on-surface">{results.length}</span>
          <span className="text-label-sm text-secondary uppercase tracking-wider mt-1">Labels</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4 border-r border-outline-variant">
          <span className="text-[28px] font-black text-green-700">{totalPass}</span>
          <span className="text-label-sm text-secondary uppercase tracking-wider mt-1">All Pass</span>
        </div>
        <div className="flex flex-col items-center justify-center py-4">
          <span className={`text-[28px] font-black ${totalFlags > 0 ? 'text-error' : 'text-on-surface'}`}>
            {totalFlags}
          </span>
          <span className="text-label-sm text-secondary uppercase tracking-wider mt-1">Total Flags</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-surface-container-lowest border border-outline-variant">
        <table className="w-full" aria-label="Batch verification results">
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                <button type="button" onClick={() => handleSort('filename')} className="flex items-center hover:text-primary transition-colors">
                  Filename{sortIndicator('filename')}
                </button>
              </th>
              <th scope="col" className={thClass}>
                <button type="button" onClick={() => handleSort('status')} className="flex items-center hover:text-primary transition-colors">
                  Status{sortIndicator('status')}
                </button>
              </th>
              <th scope="col" className={thClass}>
                <button type="button" onClick={() => handleSort('flags')} className="flex items-center hover:text-primary transition-colors">
                  Flags{sortIndicator('flags')}
                </button>
              </th>
              <th scope="col" className={thClass}>Passed</th>
              <th scope="col" className={thClass}>Details</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ result, fileName, originalIndex }) => {
              const isExpanded = expandedIndex === originalIndex
              const hasIssues =
                result.summary.flag_count > 0 ||
                result.summary.low_confidence_count > 0 ||
                result.manual_review_required

              return (
                <tr key={originalIndex} className={isExpanded ? 'bg-surface-container' : 'hover:bg-surface-container-low transition-colors'}>
                  <td colSpan={isExpanded ? 5 : undefined} className={tdClass}>
                    {isExpanded ? (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-label-bold text-on-surface">{fileName}</span>
                          <button
                            type="button"
                            onClick={() => toggleExpand(originalIndex)}
                            className="text-label-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                            aria-label={`Collapse details for ${fileName}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">expand_less</span>
                            Collapse
                          </button>
                        </div>
                        <ReviewChecklist result={result} labelDataUrls={labelDataUrls[originalIndex] ?? []} overrides={{}} onOverride={() => {}} />
                      </div>
                    ) : (
                      <span className="font-mono text-[13px]">{fileName}</span>
                    )}
                  </td>
                  {!isExpanded && (
                    <>
                      <td className={tdClass}>
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                            result.manual_review_required
                              ? 'bg-secondary-container text-on-secondary-container'
                              : hasIssues
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {result.manual_review_required
                            ? 'Manual Review'
                            : hasIssues
                              ? 'Flagged'
                              : 'Pass'}
                        </span>
                      </td>
                      <td className={tdClass}>
                        {result.summary.flag_count + result.summary.low_confidence_count}
                      </td>
                      <td className={tdClass}>{result.summary.pass_count}</td>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(originalIndex)}
                          className="text-label-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                          aria-label={`Expand details for ${fileName}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">expand_more</span>
                          Expand
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
