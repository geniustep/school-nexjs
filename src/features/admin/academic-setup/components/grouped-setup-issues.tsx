'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessIssue } from '@/types/academic-setup';
import { IconAlertTriangle } from '@/components/icons/admin-icons';
import { groupSetupIssues } from '../utils/issue-grouping';

export function GroupedSetupIssues({
  issues,
  maxGroups = 3,
  onViewAll,
}: {
  issues: SetupReadinessIssue[];
  maxGroups?: number;
  onViewAll?: () => void;
}) {
  const t = useT();
  const groups = groupSetupIssues(issues, maxGroups);
  if (!groups.length) return null;

  return (
    <div className="academic-issues-groups">
      {groups.map((group) => {
        const titleKey = `admin.academicSetup.quickActionCodes.${group.code}`;
        const title = t(titleKey);
        const label = title !== titleKey ? title : group.code;
        const samples = group.sampleNames.join('، ');
        const more = group.count > group.sampleNames.length
          ? t('admin.academicSetup.issueGroupAndMore')
          : '';

        return (
          <Link
            key={group.code}
            href={group.href}
            className={`academic-issues-groups__item academic-issues-groups__item--${group.severity}`}
          >
            <span className="academic-issues-groups__icon" aria-hidden>
              <IconAlertTriangle size={16} />
            </span>
            <span className="academic-issues-groups__copy">
              <strong>
                {t('admin.academicSetup.issueGroupCount', { count: group.count, label })}
              </strong>
              {(samples || more) && (
                <span className="academic-issues-groups__samples">
                  {samples}
                  {more}
                </span>
              )}
            </span>
            <span className="academic-issues-groups__cta">
              {t('admin.academicSetup.issueGroupView')}
            </span>
          </Link>
        );
      })}
      {onViewAll && issues.length > maxGroups && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onViewAll}>
          {t('admin.academicSetup.guided.showAllDetails')}
        </button>
      )}
    </div>
  );
}
