import type { VerificationResult } from '../types'

export const PASSING_RESULT: VerificationResult = {
  extracted: {
    brand_name: 'Test Vodka',
    class_or_type: 'Vodka',
    alcohol_content: '40% Alc./Vol.',
    net_contents: '750 mL',
    bottler_name_and_address: 'Test Distillery, Springfield, IL',
    country_of_origin: 'United States',
    government_warning: {
      verbatim_text: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
      is_all_caps: true,
      is_bold: true,
      is_continuous_paragraph: true,
      bbox: { x: 10, y: 400, width: 200, height: 80 },
    },
    bboxes: {},
  },
  fields: {
    brand_name: { status: 'PASS', extracted_value: 'Test Vodka', application_value: 'Test Vodka', region_crop: null, note: null },
    class_or_type: { status: 'PASS', extracted_value: 'Vodka', application_value: 'Vodka', region_crop: null, note: null },
    alcohol_content: { status: 'PASS', extracted_value: '40% Alc./Vol.', application_value: '40%', region_crop: null, note: null },
    net_contents: { status: 'PASS', extracted_value: '750 mL', application_value: '750 mL', region_crop: null, note: null },
    bottler_name_and_address: { status: 'PASS', extracted_value: 'Test Distillery, Springfield, IL', application_value: 'Test Distillery, Springfield, IL', region_crop: null, note: null },
    country_of_origin: { status: 'PASS', extracted_value: 'United States', application_value: 'United States', region_crop: null, note: null },
  },
  government_warning: {
    status: 'PASS',
    extracted_text: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
    canonical_text: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
    is_all_caps: true,
    is_bold: true,
    is_continuous_paragraph: true,
    region_crop: null,
    note: null,
  },
  summary: { pass_count: 6, flag_count: 0, low_confidence_count: 0, requires_full_manual_review: false },
  manual_review_required: false,
  error_reason: null,
}

export const FLAGGED_RESULT: VerificationResult = {
  ...PASSING_RESULT,
  fields: {
    ...PASSING_RESULT.fields,
    brand_name: { status: 'FLAG', extracted_value: 'Wrong Brand', application_value: 'Test Vodka', region_crop: null, note: 'Brand name does not match application.' },
    alcohol_content: { status: 'LOW_CONFIDENCE', extracted_value: 'LOW_CONFIDENCE', application_value: '40%', region_crop: null, note: 'Region too degraded to read.' },
  },
  summary: { pass_count: 4, flag_count: 1, low_confidence_count: 1, requires_full_manual_review: false },
}

export const MANUAL_REVIEW_RESULT: VerificationResult = {
  ...PASSING_RESULT,
  fields: {},
  summary: { pass_count: 0, flag_count: 0, low_confidence_count: 0, requires_full_manual_review: true },
  manual_review_required: true,
  error_reason: 'Vision extraction malformed: invalid JSON',
}
