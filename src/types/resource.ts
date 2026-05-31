// Teacher class resources — mirrors live API v1 teacher/resources payloads.

import type { Ref } from './api';
import type { AttachmentMeta } from './attachment';

export type ResourceState = 'draft' | 'published' | 'archived';

export interface ResourceSummary {
  id: number;
  name: string;
  description_short?: string | null;
  resource_type?: string | null;
  class: Ref;
  subject?: Ref | null;
  teacher?: Ref | null;
  publish_date?: string | null;
  state: ResourceState | string;
  attachment_count?: number;
  url?: string | null;
  is_read?: boolean;
}

export interface ResourceDetail extends ResourceSummary {
  description?: string | null;
  attachments?: AttachmentMeta[];
}
