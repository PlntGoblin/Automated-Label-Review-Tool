import type { ApplicationData } from '../types'
import { FIELD_ORDER, FIELD_LABELS } from '../constants'

interface ApplicationFormProps {
  data: ApplicationData
  onChange: (data: ApplicationData) => void
  disabled: boolean
}

const REQUIRED_FIELDS = new Set(['brand_name', 'class_or_type'])

const PLACEHOLDERS: Record<string, string> = {
  brand_name:               'e.g. Bison Creek IPA',
  class_or_type:            'e.g. India Pale Ale',
  alcohol_content:          'e.g. 6.5% or 6.5% Alc./Vol.',
  net_contents:             'e.g. 12 fl oz or 355 mL',
  bottler_name_and_address: 'e.g. Brewed and Bottled by Acme Brewing Co., Denver, CO.',
  country_of_origin:        'e.g. United States or USA',
}

export default function ApplicationForm({ data, onChange, disabled }: ApplicationFormProps) {
  return (
    <fieldset disabled={disabled} className="space-y-3 min-w-0">
      <legend className="w-full text-center text-2xl font-extrabold text-primary uppercase tracking-widest mb-4">
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
