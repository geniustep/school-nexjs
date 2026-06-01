// Teacher class resources — mirrors live API v1 teacher/resources payloads.

import type { Ref } from './api';
import type { AttachmentListMeta, AttachmentMeta } from './attachment';

export type ResourceState = 'draft' | 'published' | 'archived';

export interface ResourceUrlMeta {
  url?: string | null;
  can_embed?: boolean;
  embed_url?: string | null;
  provider?: string | null;
  title?: string | null;
}

export interface ResourceSummary extends AttachmentListMeta {
  id: number;
  name: string;
  description_short?: string | null;
  resource_type?: string | null;
  class: Ref;
  subject?: Ref | null;
  teacher?: Ref | null;
  publish_date?: string | null;
  state: ResourceState | string;
  url?: string | null;
  is_read?: boolean;
}

export interface ResourceDetail extends ResourceSummary {
  description?: string | null;
  attachments?: AttachmentMeta[];
  url_meta?: ResourceUrlMeta | null;
}
