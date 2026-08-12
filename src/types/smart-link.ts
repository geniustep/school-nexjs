export interface SmartLinkRef {
  id?: number | null;
  url: string;
  canonical_url?: string | null;
  title?: string | null;
  provider?: string | null;
  embed_url?: string | null;
  can_embed?: boolean | null;
  click_to_load?: boolean | null;
}
