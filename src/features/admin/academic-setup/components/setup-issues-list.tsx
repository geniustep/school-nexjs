'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';
import type { SetupQuickAction, SetupReadinessIssue } from '@/types/academic-setup';
import {
  quickActionLabel,
  readinessIssueDescription,
  readinessIssueTitle,
} from '../utils/readiness-i18n';
import { issueTargetHref, quickActionHref } from '../utils/section-routes';

export function SetupIssuesList({
  issues,
  limit = 5,
}: {
  issues: SetupReadinessIssue[];
  limit?: number;
}) {
  const t = useT();
  const visible = issues.slice(0, limit);
  if (!visible.length) return null;

  return (
    <div className="academic-setup-issues">
      {visible.map((issue) => {
        const description = readinessIssueDescription(issue, t);
        return (
          <Link
            key={issue.id}
            href={issueTargetHref(issue)}
            className={cn('academic-setup-issue', `academic-setup-issue--${issue.severity}`)}
          >
            <span aria-hidden>{severityIcon(issue.severity)}</span>
            <span>
              <strong>{readinessIssueTitle(issue, t)}</strong>
              {description && <p className="tiny muted mt-2">{description}</p>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function SetupQuickActionsList({ actions }: { actions: SetupQuickAction[] }) {
  const t = useT();
  if (!actions.length) return null;
  return (
    <div className="academic-setup-shortcuts">
      {actions.map((action) => (
        <Link
          key={`${action.code}-${action.section}`}
          href={quickActionHref(action)}
          className="btn btn--ghost btn--sm"
        >
          {quickActionLabel(action, t)}
        </Link>
      ))}
    </div>
  );
}

function severityIcon(severity: SetupReadinessIssue['severity']): string {
  switch (severity) {
    case 'error':
      return '⛔';
    case 'warning':
      return '⚠️';
    default:
      return 'ℹ️';
  }
}
