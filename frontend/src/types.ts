// Mirror of backend/app/schemas.py — kept manually in sync.
// If a contract field changes, update both files together in the same commit.

export interface ApplicationData {
  brand_name: string;
  class_or_type: string;
  alcohol_content: string;
  net_contents: string;
  bottler_name_and_address: string;
  country_of_origin: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WarningExtraction {
  verbatim_text: string | null;
  is_all_caps: boolean | null;
  is_bold: boolean | null;
  is_continuous_paragraph: boolean | null;
  bbox: BoundingBox | null;
}

export interface ExtractedLabel {
  brand_name: string | null;
  class_or_type: string | null;
  alcohol_content: string | null;
  net_contents: string | null;
  bottler_name_and_address: string | null;
  country_of_origin: string | null;
  government_warning: WarningExtraction;
  bboxes: Record<string, BoundingBox | null>;
}

export interface VerifyRequest {
  label_images: string[];
  application: ApplicationData;
}

export type FieldStatus = 'PASS' | 'FLAG' | 'LOW_CONFIDENCE';

export interface FieldResult {
  status: FieldStatus;
  extracted_value: string | null;
  application_value: string;
  region_crop: string | null;
  note: string | null;
}

export interface WarningResult {
  status: FieldStatus;
  extracted_text: string | null;
  canonical_text: string;
  is_all_caps: boolean | null;
  is_bold: boolean | null;
  is_continuous_paragraph: boolean | null;
  region_crop: string | null;
  note: string | null;
}

export interface VerificationSummary {
  pass_count: number;
  flag_count: number;
  low_confidence_count: number;
  requires_full_manual_review: boolean;
}

export interface FieldOverride {
  initials: string;
  reason: string | null;
  timestamp: string;
}

export interface VerificationResult {
  extracted: ExtractedLabel;
  fields: Record<string, FieldResult>;
  government_warning: WarningResult;
  summary: VerificationSummary;
  manual_review_required: boolean;
  error_reason: string | null;
}
