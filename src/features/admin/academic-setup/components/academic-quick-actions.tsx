'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  IconAlertTriangle,
  IconBookOpen,
  IconClipboard,
  IconGraduationCap,
  IconLayers,
} from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import type { SetupQuickAction } from '@/types/academic-setup';
import { setupIssueCodeLabel } from '../utils/readiness-i18n';
import { quickActionHref } from '../utils/section-routes';
import { limitQuickActions } from '../utils/overview-present';

const QUICK_ACTION_ICONS: Record<string, typeof IconLayers> = {
  level_without_classes: IconLayers,
  no_classes: IconLayers,
  class_without_subjects: IconBookOpen,
  level_without_subjects: IconBookOpen,
  subject_without_teacher: IconGraduationCap,
  no_teachers: IconGraduationCap,
  teacher_without_assignments: IconClipboard,
  assignment_missing: IconClipboard,
  complete_assignments: IconClipboard,
};

function QuickActionIcon({ code }: { code: string }) {
  const Icon = QUICK_ACTION_ICONS[code] ?? IconAlertTriangle;
  return <Icon size={16} />;
}

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
            <span className="academic-quick-actions__icon" aria-hidden>
              <QuickActionIcon code={action.code} />
            </span>
            <span className="academic-quick-actions__copy">
              <span className="academic-quick-actions__label">
                {setupIssueCodeLabel(action.code, t)}
              </span>
              {action.count > 0 && (
                <span className="academic-quick-actions__count">{action.count}</span>
              )}
            </span>
            <span className="academic-quick-actions__arrow" aria-hidden>
              ›
            </span>
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
