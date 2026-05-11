import type { ApplicationData } from '../types'
import { FIELD_ORDER, FIELD_LABELS } from '../constants'

interface ApplicationFormProps {
  data: ApplicationData
  onChange: (data: ApplicationData) => void
  disabled: boolean
}

const REQUIRED_FIELDS = new Set(['brand_name', 'class_or_type'])

export default function ApplicationForm({ data, onChange, disabled }: ApplicationFormProps) {
  return (
    <fieldset disabled={disabled} className="space-y-3 min-w-0">
      <legend className="text-label-bold text-secondary uppercase tracking-wider mb-1">
        Application Data
      </legend>
      {FIELD_ORDER.map((key) => {
        const multiline = key === 'bottler_name_and_address'
        const inputClass =
          'w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 transition-colors'
        return (
          <div key={key}>
            <div className="flex items-center gap-1 mb-1">
              <label
                htmlFor={key}
                className="text-label-bold text-secondary uppercase tracking-wider"
              >
                {FIELD_LABELS[key]}
              </label>
              {REQUIRED_FIELDS.has(key) && (
                <span className="text-error text-xs" aria-hidden="true">*</span>
              )}
            </div>
            {multiline ? (
              <textarea
                id={key}
                name={key}
                rows={3}
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className={`${inputClass} font-mono resize-none`}
              />
            ) : (
              <input
                id={key}
                name={key}
                type="text"
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className={inputClass}
              />
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
