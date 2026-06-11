'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { SetupIssue } from '../types';
import { buildHref } from '../utils/search';

export function SetupIssuesList({
  issues,
  limit = 5,
}: {
  issues: SetupIssue[];
  limit?: number;
}) {
  const visible = issues.slice(0, limit);
  if (!visible.length) return null;

  return (
    <div className="academic-setup-issues">
      {visible.map((issue) => (
        <Link
          key={issue.id}
          href={buildHref(issue.targetRoute, issue.query)}
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

function severityIcon(severity: SetupIssue['severity']): string {
  switch (severity) {
    case 'error':
      return '⛔';
    case 'warning':
      return '⚠️';
    default:
      return 'ℹ️';
  }
}
