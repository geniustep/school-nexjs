'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { SetupQuickAction, SetupReadinessIssue } from '@/types/academic-setup';
import { issueTargetHref, quickActionHref } from '../utils/section-routes';

export function SetupIssuesList({
  issues,
  limit = 5,
}: {
  issues: SetupReadinessIssue[];
  limit?: number;
}) {
  const visible = issues.slice(0, limit);
  if (!visible.length) return null;

  return (
    <div className="academic-setup-issues">
      {visible.map((issue) => (
        <Link
          key={issue.id}
          href={issueTargetHref(issue)}
          className={cn('academic-setup-issue', `academic-setup-issue--${issue.severity}`)}
        >
          <span aria-hidden>{severityIcon(issue.severity)}</span>
          <span>
            <strong>{issue.title}</strong>
            {issue.description && <p className="tiny muted mt-2">{issue.description}</p>}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function SetupQuickActionsList({ actions }: { actions: SetupQuickAction[] }) {
  if (!actions.length) return null;
  return (
    <div className="academic-setup-shortcuts">
      {actions.map((action) => (
        <Link
          key={`${action.code}-${action.section}`}
          href={quickActionHref(action)}
          className="btn btn--ghost btn--sm"
        >
          {action.code} ({action.count})
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
