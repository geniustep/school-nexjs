'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SetupQuickAction } from '@/types/academic-setup';
import { quickActionLabel } from '../utils/readiness-i18n';
import { quickActionHref } from '../utils/section-routes';
import { limitQuickActions } from '../utils/overview-present';

export function AcademicQuickActions({
  actions,
  limit = 4,
}: {
  actions: SetupQuickAction[];
  limit?: number;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const top = limitQuickActions(actions, limit);
  const rest = actions.filter(
    (a) => !top.some((t) => t.code === a.code && t.section === a.section),
  );
  const visible = expanded ? [...top, ...rest] : top;

  if (!visible.length) return null;

  return (
    <div className="academic-quick-actions">
      <div className="academic-quick-actions__grid">
        {visible.map((action) => (
          <Link
            key={`${action.code}-${action.section}`}
            href={quickActionHref(action)}
            className="academic-quick-actions__item"
          >
            {quickActionLabel(action, t)}
          </Link>
        ))}
      </div>
      {!expanded && rest.length > 0 && (
        <button
          type="button"
          className="btn btn--ghost btn--sm academic-quick-actions__more-btn"
          onClick={() => setExpanded(true)}
        >
          {t('admin.academicSetup.viewMore')}
        </button>
      )}
    </div>
  );
}
