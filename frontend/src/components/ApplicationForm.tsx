import { Label, TextInput, Textarea } from '@trussworks/react-uswds'
import type { ApplicationData } from '../types'

interface ApplicationFormProps {
  data: ApplicationData
  onChange: (data: ApplicationData) => void
  disabled: boolean
}

const FIELDS: { key: keyof ApplicationData; label: string; multiline?: boolean }[] = [
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'class_or_type', label: 'Class / Type' },
  { key: 'alcohol_content', label: 'Alcohol Content' },
  { key: 'net_contents', label: 'Net Contents' },
  { key: 'bottler_name_and_address', label: 'Bottler Name & Address', multiline: true },
  { key: 'country_of_origin', label: 'Country of Origin' },
]

export default function ApplicationForm({ data, onChange, disabled }: ApplicationFormProps) {
  const update = (key: keyof ApplicationData, value: string) => {
    onChange({ ...data, [key]: value })
  }

  return (
    <fieldset className="usa-fieldset" disabled={disabled}>
      <legend className="usa-legend usa-legend--large">Application Data</legend>
      {FIELDS.map(({ key, label, multiline }) => (
        <div key={key} className="usa-form-group">
          <Label htmlFor={key}>{label}</Label>
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
      ))}
    </fieldset>
  )
}
