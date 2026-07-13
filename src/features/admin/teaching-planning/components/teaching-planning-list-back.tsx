'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function TeachingPlanningListBack() {
  const t = useT();
  return (
    <Link
      href="/admin/teaching-planning"
      className="tp-list__back"
      aria-label={t('admin.teachingPlanning.backToHub')}
    >
      <span className="tp-list__back-icon" aria-hidden="true">
        ←
      </span>
      {t('admin.teachingPlanning.backToHub')}
    </Link>
  );
}
