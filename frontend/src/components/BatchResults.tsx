import { useState, useMemo } from 'react'
import type { VerificationResult } from '../types'
import ReviewChecklist from './ReviewChecklist'

interface BatchResultsProps {
  results: VerificationResult[]
  fileNames: string[]
}

type SortKey = 'filename' | 'status' | 'flags'

function resultSortValue(r: VerificationResult): number {
  if (r.manual_review_required || r.summary.requires_full_manual_review) return 0
  if (r.summary.flag_count > 0 || r.summary.low_confidence_count > 0) return 1
  return 2
}

export default function BatchResults({ results, fileNames }: BatchResultsProps) {
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
  const totalPass = results.filter((r) => r.summary.flag_count === 0 && r.summary.low_confidence_count === 0 && !r.manual_review_required).length

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortAsc ? ' \u25B2' : ' \u25BC'
  }

  return (
    <div className="batch-results">
      <div className="summary-bar" role="status" aria-label="Batch summary">
        <div className="summary-stat">
          <div className="summary-stat__count">{results.length}</div>
          <div className="summary-stat__label">Labels</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat__count" style={{ color: '#216e1f' }}>{totalPass}</div>
          <div className="summary-stat__label">All Pass</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat__count" style={{ color: totalFlags > 0 ? '#b50909' : undefined }}>{totalFlags}</div>
          <div className="summary-stat__label">Total Flags</div>
        </div>
      </div>

      <table className="batch-table usa-table usa-table--borderless" aria-label="Batch verification results">
        <thead>
          <tr>
            <th scope="col">
              <button type="button" className="batch-table__sort-btn" onClick={() => handleSort('filename')}>
                Filename{sortIndicator('filename')}
              </button>
            </th>
            <th scope="col">
              <button type="button" className="batch-table__sort-btn" onClick={() => handleSort('status')}>
                Status{sortIndicator('status')}
              </button>
            </th>
            <th scope="col">
              <button type="button" className="batch-table__sort-btn" onClick={() => handleSort('flags')}>
                Flags{sortIndicator('flags')}
              </button>
            </th>
            <th scope="col">Pass</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ result, fileName, originalIndex }) => {
            const isExpanded = expandedIndex === originalIndex
            const hasIssues = result.summary.flag_count > 0 || result.summary.low_confidence_count > 0 || result.manual_review_required
            return (
              <tr key={originalIndex} className={isExpanded ? 'batch-table__row--expanded' : ''}>
                <td colSpan={isExpanded ? 5 : undefined}>
                  {isExpanded ? (
                    <div>
                      <div className="batch-table__expanded-header">
                        <strong>{fileName}</strong>
                        <button
                          type="button"
                          className="batch-table__toggle"
                          onClick={() => toggleExpand(originalIndex)}
                          aria-label={`Collapse details for ${fileName}`}
                        >
                          Collapse
                        </button>
                      </div>
                      <ReviewChecklist result={result} />
                    </div>
                  ) : (
                    <>{fileName}</>
                  )}
                </td>
                {!isExpanded && (
                  <>
                    <td>
                      <span className={`status-badge ${hasIssues ? 'status-badge--flag' : 'status-badge--pass'}`}>
                        {result.manual_review_required
                          ? 'Manual Review'
                          : hasIssues
                            ? 'Flagged'
                            : 'Pass'}
                      </span>
                    </td>
                    <td>{result.summary.flag_count + result.summary.low_confidence_count}</td>
                    <td>{result.summary.pass_count}</td>
                    <td>
                      <button
                        type="button"
                        className="batch-table__toggle"
                        onClick={() => toggleExpand(originalIndex)}
                        aria-label={`Expand details for ${fileName}`}
                      >
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
  )
}
