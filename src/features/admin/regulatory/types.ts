export interface RegulatoryReferenceItem {
  public_id: string;
  code: string;
  title: string;
  item_type: string;
  date_from: string | null;
  date_to: string | null;
  date_precision: string;
  official_date_text: string | null;
  applicability: string;
  source_page_from: number | null;
  source_page_to: number | null;
}

export interface RegulatoryReferenceOverview {
  release: {
    bundle_id: string;
    publication_version: string;
    published_at: string | null;
    source_reference_numbers: string[];
  };
  projection: {
    calendar_id: number | null;
    state: string | null;
    source_reference: string | null;
  };
  upcoming: RegulatoryReferenceItem[];
  pending_official_dates: RegulatoryReferenceItem[];
}

export interface RegulatoryProjectionResult {
  ok: boolean;
  changed: boolean;
  calendar_id: number;
  bundle_id: string;
  projected_count: number;
  pending_non_gregorian_count?: number;
}
