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
  PASS: 'inline-flex items-center text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider bg-green-100 text-green-800',
  FLAG: 'inline-flex items-center text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider bg-error-container text-on-error-container',
  LOW_CONFIDENCE: 'inline-flex items-center text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider bg-amber-100 text-amber-800',
}
