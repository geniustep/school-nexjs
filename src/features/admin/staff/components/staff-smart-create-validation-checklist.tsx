'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StaffSmartCreateFormIssue } from '@/features/admin/staff/utils/staff-template-utils';

export function StaffSmartCreateValidationChecklist({
  issues,
  showPending,
}: {
  issues: StaffSmartCreateFormIssue[];
  showPending: boolean;
}) {
  const t = useT();
  const pendingCount = issues.filter((issue) => !issue.ok).length;
  const complete = pendingCount === 0 && issues.length > 0;

  return (
    <section
      className={`staff-smart-create__validation-card${complete ? ' is-complete' : ''}${showPending && pendingCount > 0 ? ' has-pending' : ''}`}
      aria-live="polite"
    >
      <header className="staff-smart-create__validation-card-header">
        <h3 className="staff-smart-create__validation-card-title">
          {t('admin.staffCenter.smartCreate.validation.title')}
        </h3>
        <span
          className={`staff-smart-create__validation-card-badge${complete ? ' is-complete' : ''}`}
        >
          {complete
            ? t('admin.staffCenter.smartCreate.validation.allComplete')
            : t('admin.staffCenter.smartCreate.validation.pendingCount', { count: pendingCount })}
        </span>
      </header>
      <p className="staff-smart-create__validation-card-desc">
        {t('admin.staffCenter.smartCreate.validation.hint')}
      </p>
      <ul className="staff-smart-create__validation-list">
        {issues.map((issue) => {
          const label = t(issue.labelKey);
          const pending = !issue.ok;
          const showIssueError = showPending && pending;
          return (
            <li
              key={issue.id}
              className={`staff-smart-create__validation-item${issue.ok ? ' is-ok' : ''}${showIssueError ? ' is-pending' : ''}`}
              data-section={issue.section}
            >
              <span className="staff-smart-create__validation-marker" aria-hidden="true">
                {issue.ok ? '✓' : '○'}
              </span>
              <span className="staff-smart-create__validation-label">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
