import type { VerificationResult } from './types'

export interface DemoScenario {
  id: string
  title: string
  description: string
  result: VerificationResult
}

// Single source of truth — mirrors backend/app/canonical.py
const CANONICAL_WARNING =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.'

// Region crops extracted from Sonora Brewing Co. Desert Amber label (1024×692px).
const CROPS = {
  brand_name:               '/crops/brand_name.png',
  class_or_type:            '/crops/class_or_type.png',
  alcohol_content:          '/crops/alcohol_content.png',
  net_contents:             '/crops/net_contents.png',
  bottler_name_and_address: '/crops/country_of_origin.png',
  country_of_origin:        '/crops/country_of_origin.png',
  government_warning:       '/crops/gov_warning.png',
}

const ALL_PASS: VerificationResult = {
  extracted: {
    brand_name: 'Desert Amber',
    class_or_type: 'Amber Ale',
    alcohol_content: '5.2% Alc. by Vol.',
    net_contents: '12 fl oz (355 mL)',
    bottler_name_and_address: 'Sonora Brewing Company, LLC, Phoenix, AZ',
    country_of_origin: 'United States',
    government_warning: {
      verbatim_text: CANONICAL_WARNING,
      is_all_caps: true,
      is_bold: false,
      is_continuous_paragraph: true,
      bbox: { x: 90, y: 10, width: 75, height: 672 },
    },
    bboxes: {
      brand_name:               { x: 335, y: 525, width: 475, height: 55  },
      class_or_type:            { x: 390, y: 578, width: 360, height: 44  },
      alcohol_content:          { x: 575, y: 607, width: 250, height: 38  },
      net_contents:             { x: 248, y: 607, width: 270, height: 38  },
      bottler_name_and_address: { x: 843, y: 280, width: 172, height: 130 },
      country_of_origin:        { x: 843, y: 415, width: 172, height: 40  },
    },
  },
  fields: {
    brand_name:               { status: 'PASS', extracted_value: 'Desert Amber',                                   application_value: 'Desert Amber',                                   region_crop: CROPS.brand_name,               note: null },
    class_or_type:            { status: 'PASS', extracted_value: 'Amber Ale',                                      application_value: 'Amber Ale',                                      region_crop: CROPS.class_or_type,            note: null },
    alcohol_content:          { status: 'PASS', extracted_value: '5.2% Alc. by Vol.',                              application_value: '5.2%',                                           region_crop: CROPS.alcohol_content,          note: null },
    net_contents:             { status: 'PASS', extracted_value: '12 fl oz (355 mL)',                              application_value: '12 fl oz',                                       region_crop: CROPS.net_contents,             note: null },
    bottler_name_and_address: { status: 'PASS', extracted_value: 'Sonora Brewing Company, LLC, Phoenix, AZ',       application_value: 'Sonora Brewing Company, LLC, Phoenix, AZ',       region_crop: CROPS.bottler_name_and_address, note: null },
    country_of_origin:        { status: 'PASS', extracted_value: 'United States',                                  application_value: 'United States',                                  region_crop: CROPS.country_of_origin,        note: null },
  },
  government_warning: {
    status: 'PASS',
    extracted_text: CANONICAL_WARNING,
    canonical_text: CANONICAL_WARNING,
    is_all_caps: true,
    is_bold: false,
    is_continuous_paragraph: true,
    region_crop: CROPS.government_warning,
  },
  summary: { pass_count: 6, flag_count: 0, low_confidence_count: 0, requires_full_manual_review: false },
  manual_review_required: false,
  error_reason: null,
}

const MIXED_FLAGS: VerificationResult = {
  extracted: {
    brand_name: 'Desert Amber Reserve',
    class_or_type: 'Amber Ale',
    alcohol_content: '4.9% Alc. by Vol.',
    net_contents: '12 fl oz (355 mL)',
    bottler_name_and_address: 'Sonora Brewing Company, LLC, Phoenix, AZ',
    country_of_origin: 'United States',
    government_warning: {
      verbatim_text: CANONICAL_WARNING,
      is_all_caps: false,
      is_bold: true,
      is_continuous_paragraph: true,
      bbox: { x: 90, y: 10, width: 75, height: 672 },
    },
    bboxes: {
      brand_name:               { x: 335, y: 525, width: 475, height: 55  },
      class_or_type:            { x: 390, y: 578, width: 360, height: 44  },
      alcohol_content:          { x: 575, y: 607, width: 250, height: 38  },
      net_contents:             { x: 248, y: 607, width: 270, height: 38  },
      bottler_name_and_address: { x: 843, y: 280, width: 172, height: 130 },
      country_of_origin:        { x: 843, y: 415, width: 172, height: 40  },
    },
  },
  fields: {
    brand_name:               { status: 'FLAG', extracted_value: 'Desert Amber Reserve',                           application_value: 'Desert Amber',                                   region_crop: CROPS.brand_name,               note: 'Brand name has extra text not in application.' },
    class_or_type:            { status: 'PASS', extracted_value: 'Amber Ale',                                      application_value: 'Amber Ale',                                      region_crop: CROPS.class_or_type,            note: null },
    alcohol_content:          { status: 'FLAG', extracted_value: '4.9% Alc. by Vol.',                              application_value: '5.2%',                                           region_crop: CROPS.alcohol_content,          note: 'ABV mismatch: label 4.9% vs application 5.2% (beyond ±0.3% tolerance)' },
    net_contents:             { status: 'PASS', extracted_value: '12 fl oz (355 mL)',                              application_value: '12 fl oz',                                       region_crop: CROPS.net_contents,             note: null },
    bottler_name_and_address: { status: 'PASS', extracted_value: 'Sonora Brewing Company, LLC, Phoenix, AZ',       application_value: 'Sonora Brewing Company, LLC, Phoenix, AZ',       region_crop: CROPS.bottler_name_and_address, note: null },
    country_of_origin:        { status: 'PASS', extracted_value: 'United States',                                  application_value: 'United States',                                  region_crop: CROPS.country_of_origin,        note: null },
  },
  government_warning: {
    status: 'PASS',
    extracted_text: CANONICAL_WARNING,
    canonical_text: CANONICAL_WARNING,
    is_all_caps: false,
    is_bold: true,
    is_continuous_paragraph: true,
    region_crop: CROPS.government_warning,
  },
  summary: { pass_count: 4, flag_count: 2, low_confidence_count: 0, requires_full_manual_review: false },
  manual_review_required: false,
  error_reason: null,
}

const LOW_CONFIDENCE: VerificationResult = {
  extracted: {
    brand_name: 'Desert Amber',
    class_or_type: 'Amber Ale',
    alcohol_content: 'LOW_CONFIDENCE',
    net_contents: '12 fl oz (355 mL)',
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
      brand_name:    { x: 335, y: 525, width: 475, height: 55 },
      class_or_type: { x: 390, y: 578, width: 360, height: 44 },
      net_contents:  { x: 248, y: 607, width: 270, height: 38 },
      country_of_origin: { x: 843, y: 415, width: 172, height: 40 },
    },
  },
  fields: {
    brand_name:               { status: 'PASS',           extracted_value: 'Desert Amber',                         application_value: 'Desert Amber',                                   region_crop: CROPS.brand_name,               note: null },
    class_or_type:            { status: 'FLAG',           extracted_value: 'Amber Ale',                            application_value: 'Craft Malt Beverage',                            region_crop: CROPS.class_or_type,            note: 'Class/type does not match application.' },
    alcohol_content:          { status: 'LOW_CONFIDENCE', extracted_value: 'LOW_CONFIDENCE',                       application_value: '5.2%',                                           region_crop: CROPS.alcohol_content,          note: 'Region too degraded to read.' },
    net_contents:             { status: 'PASS',           extracted_value: '12 fl oz (355 mL)',                    application_value: '12 fl oz',                                       region_crop: CROPS.net_contents,             note: null },
    bottler_name_and_address: { status: 'LOW_CONFIDENCE', extracted_value: 'LOW_CONFIDENCE',                       application_value: 'Sonora Brewing Company, LLC, Phoenix, AZ',       region_crop: CROPS.bottler_name_and_address, note: 'Region too degraded to read.' },
    country_of_origin:        { status: 'PASS',           extracted_value: 'United States',                        application_value: 'United States',                                  region_crop: CROPS.country_of_origin,        note: null },
  },
  government_warning: {
    status: 'LOW_CONFIDENCE',
    extracted_text: null,
    canonical_text: CANONICAL_WARNING,
    is_all_caps: null,
    is_bold: null,
    is_continuous_paragraph: null,
    region_crop: CROPS.government_warning,
  },
  summary: { pass_count: 3, flag_count: 1, low_confidence_count: 2, requires_full_manual_review: true },
  manual_review_required: false,
  error_reason: null,
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'all-pass',
    title: 'All Fields Pass',
    description: 'All 6 fields and the government warning match the COLA application exactly.',
    result: ALL_PASS,
  },
  {
    id: 'mixed-flags',
    title: 'Brand & ABV Flagged',
    description: 'Brand name has extra text and ABV is outside tolerance — two fields flagged for review.',
    result: MIXED_FLAGS,
  },
  {
    id: 'low-confidence',
    title: 'Degraded Label',
    description: 'Multiple fields are unreadable due to label damage — triggers full manual review.',
    result: LOW_CONFIDENCE,
  },
]
