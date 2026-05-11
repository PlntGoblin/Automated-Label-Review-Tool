import type { FieldStatus } from './types'

export const FIELD_LABELS: Record<string, string> = {
  brand_name: 'Brand Name',
  class_or_type: 'Class / Type',
  alcohol_content: 'Alcohol Content',
  net_contents: 'Net Contents',
  bottler_name_and_address: 'Bottler Name & Address',
  country_of_origin: 'Country of Origin',
}

export const FIELD_ORDER = [
  'brand_name',
  'class_or_type',
  'alcohol_content',
  'net_contents',
  'bottler_name_and_address',
  'country_of_origin',
] as const

export const STATUS_CLASS: Record<FieldStatus, string> = {
  PASS: 'status-badge--pass',
  FLAG: 'status-badge--flag',
  LOW_CONFIDENCE: 'status-badge--low-confidence',
}
