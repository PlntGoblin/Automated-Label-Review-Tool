import type { ApplicationData } from '../types'
import { FIELD_ORDER, FIELD_LABELS } from '../constants'

interface ApplicationFormProps {
  data: ApplicationData
  onChange: (data: ApplicationData) => void
  disabled: boolean
}

const REQUIRED_FIELDS = new Set(['brand_name', 'class_or_type'])

const PLACEHOLDERS: Record<string, string> = {
  brand_name:               'e.g. Jack Daniel\'s',
  class_or_type:            'e.g. Tennessee Whiskey',
  alcohol_content:          'e.g. 40% Alc./Vol. (80 Proof)',
  net_contents:             'e.g. 750 mL',
  bottler_name_and_address: 'e.g. Jack Daniel Distillery, Lynchburg, TN 37352',
  country_of_origin:        'e.g. United States',
}

export default function ApplicationForm({ data, onChange, disabled }: ApplicationFormProps) {
  return (
    <fieldset disabled={disabled} className="space-y-3 min-w-0">
{FIELD_ORDER.map((key) => {
        const multiline = key === 'bottler_name_and_address'
        const inputClass =
          'w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 transition-colors'
        return (
          <div key={key}>
            <div className="flex items-center gap-1 mb-1">
              <label
                htmlFor={key}
                className="text-label-bold text-on-surface uppercase tracking-wider"
              >
                {FIELD_LABELS[key]}
              </label>
              {REQUIRED_FIELDS.has(key) && (
                <span className="text-error text-xs" aria-hidden="true">*</span>
              )}
            </div>
            {key === 'net_contents' && (
              <p className="text-xs text-secondary mb-1">
                Include units — e.g. <span className="font-mono">12 fl oz</span>, <span className="font-mono">355 mL</span>, <span className="font-mono">750 mL</span>, <span className="font-mono">1 L</span>
              </p>
            )}
            {multiline ? (
              <textarea
                id={key}
                name={key}
                rows={3}
                placeholder={PLACEHOLDERS[key]}
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                className={`${inputClass} font-mono resize-none`}
              />
            ) : (
              <input
                id={key}
                name={key}
                type="text"
                placeholder={PLACEHOLDERS[key]}
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
