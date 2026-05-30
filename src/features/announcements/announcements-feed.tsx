'use client';

// Read-only announcements feed. Shared by parent child-announcements and the
// student announcements page. Paginated, no compose.

import { useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Card } from '@/components/ui/primitives';
import { Pagination } from '@/components/tables/data-table';
import { formatDateTime } from '@/lib/utils/format';
import type { Announcement } from '@/types/message';

export function AnnouncementsFeed({ path }: { path: string }) {
  const [page, setPage] = useState(1);
  const state = useResource<Announcement[]>(path, { page, page_size: 20 });
  const pg = state.meta?.pagination;

  return (
    <ResourceView
      state={state}
      loadingLabel="Loading announcements…"
      isEmpty={(d) => d.length === 0}
      empty={<EmptyState icon="📣" title="No announcements" description="There are no announcements yet." />}
    >
      {(items) => (
        <>
          <Card pad={false}>
            {items.map((a, i) => (
              <div
                key={a.id}
                className="card--pad"
                style={i ? { borderTop: '1px solid var(--c-border)' } : undefined}
              >
                <div className="between">
                  <strong className="tiny">
                    {typeof a.channel === 'string' ? a.channel : a.channel?.name}
                  </strong>
                  <span className="tiny faint">{formatDateTime(a.created_at)}</span>
                </div>
                <div className="tiny muted">{a.sender}</div>
                <div className="mt-2">{a.body}</div>
              </div>
            ))}
          </Card>
          {pg && (
            <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
          )}
        </>
      )}
    </ResourceView>
  );
}
