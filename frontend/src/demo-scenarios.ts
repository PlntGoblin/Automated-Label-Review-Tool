import type { VerificationResult } from './types'

export interface DemoScenario {
  id: string
  title: string
  description: string
  result: VerificationResult
}

const ALL_PASS: VerificationResult = {
  extracted: {
    brand_name: 'Eagle Ridge',
    class_or_type: 'Straight Bourbon Whiskey',
    alcohol_content: '45% Alc./Vol. (90 Proof)',
    net_contents: '750 mL',
    bottler_name_and_address: 'Eagle Ridge Distillery, Bardstown, KY 40004',
    country_of_origin: 'United States',
    government_warning: {
      verbatim_text:
        'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
      is_all_caps: true,
      is_bold: false,
      is_continuous_paragraph: true,
      bbox: { x: 30, y: 520, width: 340, height: 90 },
    },
    bboxes: {
      brand_name: { x: 50, y: 30, width: 300, height: 60 },
      class_or_type: { x: 80, y: 100, width: 240, height: 30 },
      alcohol_content: { x: 100, y: 400, width: 200, height: 25 },
      net_contents: { x: 150, y: 430, width: 100, height: 25 },
      bottler_name_and_address: { x: 40, y: 460, width: 320, height: 45 },
      country_of_origin: { x: 120, y: 510, width: 160, height: 20 },
    },
  },
  fields: {
    brand_name: { status: 'PASS', extracted_value: 'Eagle Ridge', application_value: 'Eagle Ridge', region_crop: null, note: null },
    class_or_type: { status: 'PASS', extracted_value: 'Straight Bourbon Whiskey', application_value: 'Straight Bourbon Whiskey', region_crop: null, note: null },
    alcohol_content: { status: 'PASS', extracted_value: '45% Alc./Vol. (90 Proof)', application_value: '45%', region_crop: null, note: null },
    net_contents: { status: 'PASS', extracted_value: '750 mL', application_value: '750 mL', region_crop: null, note: null },
    bottler_name_and_address: { status: 'PASS', extracted_value: 'Eagle Ridge Distillery, Bardstown, KY 40004', application_value: 'Eagle Ridge Distillery, Bardstown, KY 40004', region_crop: null, note: null },
    country_of_origin: { status: 'PASS', extracted_value: 'United States', application_value: 'United States', region_crop: null, note: null },
  },
  government_warning: {
    status: 'PASS',
    extracted_text:
      'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
    canonical_text:
      'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
    is_all_caps: true,
    is_bold: false,
    is_continuous_paragraph: true,
    region_crop: null,
  },
  summary: { pass_count: 6, flag_count: 0, low_confidence_count: 0, requires_full_manual_review: false },
  manual_review_required: false,
  error_reason: null,
}

const MIXED_FLAGS: VerificationResult = {
  extracted: {
    brand_name: 'Sierra Blanca',
    class_or_type: 'Tequila',
    alcohol_content: '38% Alc./Vol.',
    net_contents: '1 L',
    bottler_name_and_address: 'Destiladora Sierra Blanca S.A. de C.V., Jalisco, Mexico',
    country_of_origin: 'Mexico',
    government_warning: {
      verbatim_text:
        'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
      is_all_caps: false,
      is_bold: true,
      is_continuous_paragraph: true,
      bbox: { x: 20, y: 500, width: 360, height: 85 },
    },
    bboxes: {
      brand_name: { x: 60, y: 20, width: 280, height: 55 },
      class_or_type: { x: 90, y: 90, width: 220, height: 28 },
      alcohol_content: { x: 110, y: 380, width: 180, height: 22 },
      net_contents: { x: 160, y: 410, width: 80, height: 22 },
      bottler_name_and_address: { x: 30, y: 440, width: 340, height: 50 },
      country_of_origin: { x: 130, y: 490, width: 140, height: 20 },
    },
  },
  fields: {
    brand_name: { status: 'FLAG', extracted_value: 'Sierra Blanca Silver', application_value: 'Sierra Blanca', region_crop: null, note: 'Brand name does not match application.' },
    class_or_type: { status: 'PASS', extracted_value: 'Tequila', application_value: 'Tequila', region_crop: null, note: null },
    alcohol_content: { status: 'FLAG', extracted_value: '38% Alc./Vol.', application_value: '40%', region_crop: null, note: 'ABV mismatch: label 38.0% vs application 40.0% (tolerance \u00b10.01%)' },
    net_contents: { status: 'PASS', extracted_value: '1 L', application_value: '1 L', region_crop: null, note: null },
    bottler_name_and_address: { status: 'PASS', extracted_value: 'Destiladora Sierra Blanca S.A. de C.V., Jalisco, Mexico', application_value: 'Destiladora Sierra Blanca S.A. de C.V., Jalisco, Mexico', region_crop: null, note: null },
    country_of_origin: { status: 'PASS', extracted_value: 'Mexico', application_value: 'Mexico', region_crop: null, note: null },
  },
  government_warning: {
    status: 'PASS',
    extracted_text:
      'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
    canonical_text:
      'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
    is_all_caps: false,
    is_bold: true,
    is_continuous_paragraph: true,
    region_crop: null,
  },
  summary: { pass_count: 4, flag_count: 2, low_confidence_count: 0, requires_full_manual_review: false },
  manual_review_required: false,
  error_reason: null,
}

const LOW_CONFIDENCE: VerificationResult = {
  extracted: {
    brand_name: 'Coastal Mist',
    class_or_type: 'Hard Seltzer',
    alcohol_content: 'LOW_CONFIDENCE',
    net_contents: '355 mL',
    bottler_name_and_address: 'LOW_CONFIDENCE',
    country_of_origin: 'United States',
    government_warning: {
      verbatim_text: 'LOW_CONFIDENCE',
      is_all_caps: null,
      is_bold: null,
      is_continuous_paragraph: null,
      bbox: null,
    },
    bboxes: {
      brand_name: { x: 40, y: 15, width: 320, height: 50 },
      class_or_type: { x: 70, y: 75, width: 260, height: 25 },
      net_contents: { x: 140, y: 390, width: 120, height: 22 },
      country_of_origin: { x: 110, y: 420, width: 180, height: 20 },
    },
  },
  fields: {
    brand_name: { status: 'PASS', extracted_value: 'Coastal Mist', application_value: 'Coastal Mist', region_crop: null, note: null },
    class_or_type: { status: 'FLAG', extracted_value: 'Hard Seltzer', application_value: 'Malt Beverage', region_crop: null, note: 'Class/type does not match application.' },
    alcohol_content: { status: 'LOW_CONFIDENCE', extracted_value: 'LOW_CONFIDENCE', application_value: '5%', region_crop: null, note: 'Region too degraded to read.' },
    net_contents: { status: 'PASS', extracted_value: '355 mL', application_value: '12 fl oz', region_crop: null, note: null },
    bottler_name_and_address: { status: 'LOW_CONFIDENCE', extracted_value: 'LOW_CONFIDENCE', application_value: 'Coastal Beverages Inc., San Diego, CA 92101', region_crop: null, note: 'Region too degraded to read.' },
    country_of_origin: { status: 'PASS', extracted_value: 'United States', application_value: 'United States', region_crop: null, note: null },
  },
  government_warning: {
    status: 'LOW_CONFIDENCE',
    extracted_text: null,
    canonical_text:
      'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
    is_all_caps: null,
    is_bold: null,
    is_continuous_paragraph: null,
    region_crop: null,
  },
  summary: { pass_count: 3, flag_count: 1, low_confidence_count: 2, requires_full_manual_review: true },
  manual_review_required: false,
  error_reason: null,
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'all-pass',
    title: 'All Fields Pass',
    description: 'Bourbon label — all 6 fields and government warning match the COLA application.',
    result: ALL_PASS,
  },
  {
    id: 'mixed-flags',
    title: 'Brand & ABV Flagged',
    description: 'Tequila label — brand name has extra text, ABV is 2% below the application (beyond tolerance).',
    result: MIXED_FLAGS,
  },
  {
    id: 'low-confidence',
    title: 'Degraded Label',
    description: 'Hard seltzer with a damaged label — multiple fields unreadable, triggers full manual review.',
    result: LOW_CONFIDENCE,
  },
]
