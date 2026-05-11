import { Label, TextInput, Textarea } from '@trussworks/react-uswds'
import type { ApplicationData } from '../types'
import { FIELD_ORDER, FIELD_LABELS } from '../constants'

interface ApplicationFormProps {
  data: ApplicationData
  onChange: (data: ApplicationData) => void
  disabled: boolean
}

export default function ApplicationForm({ data, onChange, disabled }: ApplicationFormProps) {
  const update = (key: keyof ApplicationData, value: string) => {
    onChange({ ...data, [key]: value })
  }

  return (
    <fieldset className="usa-fieldset" disabled={disabled}>
      <legend className="usa-legend usa-legend--large">Application Data</legend>
      {FIELD_ORDER.map((key) => {
        const multiline = key === 'bottler_name_and_address'
        return (
          <div key={key} className="usa-form-group">
            <Label htmlFor={key}>{FIELD_LABELS[key]}</Label>
            {multiline ? (
              <Textarea
                id={key}
                name={key}
                value={data[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            ) : (
              <TextInput
                id={key}
                name={key}
                type="text"
                value={data[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
