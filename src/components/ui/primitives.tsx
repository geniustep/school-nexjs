// Shared presentational primitives. Server-component-safe (no client hooks).

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { initials } from '@/lib/utils/format';

export type StatTone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'none';

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate';

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('badge', `badge--${tone}`)}>{children}</span>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header between">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'none',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className={cn('card stat-card', tone !== 'none' && `stat-card--${tone}`)}>
      <div className="stat-card__label">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="stat-card__value">{value}</div>
    </div>
  );
}

export function InfoBanner({
  title,
  description,
  icon = 'ℹ',
  tone = 'blue',
}: {
  title: string;
  description?: string;
  icon?: string;
  tone?: 'blue' | 'amber' | 'green';
}) {
  return (
    <div className={cn('info-banner', tone === 'amber' && 'info-banner--amber', tone === 'green' && 'info-banner--green')}>
      <span className="info-banner__icon" aria-hidden="true">{icon}</span>
      <div className="info-banner__body">
        <span className="info-banner__title">{title}</span>
        {description && <span className="info-banner__desc">{description}</span>}
      </div>
    </div>
  );
}

export function Card({
  children,
  pad = true,
  className,
}: {
  children: ReactNode;
  pad?: boolean;
  className?: string;
}) {
  return <div className={cn('card', pad && 'card--pad', className)}>{children}</div>;
}

export function Avatar({ name }: { name: string | null | undefined }) {
  return <span className="avatar">{initials(name)}</span>;
}

export function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section__head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function DefinitionList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="dl">
      {items.map((it, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{it.label}</dt>
          <dd>{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
