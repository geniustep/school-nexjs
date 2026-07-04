'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export type ExecutiveTone = 'blue' | 'green' | 'amber' | 'red' | 'neutral';

const TONE_LABEL: Record<ExecutiveTone, string> = {
  blue: 'exec-kpi--blue',
  green: 'exec-kpi--green',
  amber: 'exec-kpi--amber',
  red: 'exec-kpi--red',
  neutral: 'exec-kpi--neutral',
};

export function ExecutiveKpiCard({
  label,
  value,
  hint,
  badge,
  tone = 'neutral',
  href,
  empty,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  badge?: string;
  tone?: ExecutiveTone;
  href?: string;
  empty?: boolean;
}) {
  const className = cn(
    'exec-kpi',
    TONE_LABEL[tone],
    href && 'exec-kpi--link',
    empty && 'exec-kpi--empty',
  );

  const inner = (
    <>
      <div className="exec-kpi__top">
        <span className="exec-kpi__label">{label}</span>
        {badge ? <span className="exec-kpi__badge">{badge}</span> : null}
      </div>
      <div className="exec-kpi__value">{value}</div>
      {hint ? <p className="exec-kpi__hint">{hint}</p> : null}
      {href ? <span className="exec-kpi__cta" aria-hidden="true" /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function ExecutivePanel({
  title,
  description,
  icon,
  footer,
  variant = 'default',
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: string;
  footer?: ReactNode;
  variant?: 'default' | 'accent' | 'attention';
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'exec-panel',
        variant === 'accent' && 'exec-panel--accent',
        variant === 'attention' && 'exec-panel--attention',
        className,
      )}
    >
      <header className="exec-panel__head">
        <div className="exec-panel__title-row">
          {icon ? (
            <span className="exec-panel__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h3 className="exec-panel__title">{title}</h3>
        </div>
        {description ? <p className="exec-panel__desc">{description}</p> : null}
      </header>
      <div className="exec-panel__body">{children}</div>
      {footer ? <footer className="exec-panel__foot">{footer}</footer> : null}
    </article>
  );
}

export function ExecutiveZoneLabel({ children }: { children: ReactNode }) {
  return <h2 className="exec-zone-label">{children}</h2>;
}

export function ExecutiveEmpty({
  icon = '◌',
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="exec-empty">
      <span className="exec-empty__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="exec-empty__title">{title}</p>
      {description ? <p className="exec-empty__desc">{description}</p> : null}
    </div>
  );
}

export function ExecutiveInterventionItem({
  item,
}: {
  item: {
    id: string;
    label: string;
    hint?: string;
    href?: string;
    icon?: string;
    tone?: 'amber' | 'default';
  };
}) {
  const severity = item.tone === 'amber' ? 'high' : 'normal';
  const inner = (
    <>
      <span className={cn('exec-decision__severity', `exec-decision__severity--${severity}`)} />
      {item.icon ? (
        <span className="exec-decision__icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className="exec-decision__copy">
        <span className="exec-decision__label">{item.label}</span>
        {item.hint ? <span className="exec-decision__hint">{item.hint}</span> : null}
      </span>
      {item.href ? <span className="exec-decision__arrow" aria-hidden="true" /> : null}
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="exec-decision exec-decision--link">
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="exec-decision">{inner}</div>
    </li>
  );
}

export function ExecutiveDecisionList({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: {
    id: string;
    label: string;
    hint?: string;
    href?: string;
    icon?: string;
    tone?: 'amber' | 'default';
  }[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (!items.length) {
    return <ExecutiveEmpty icon="✓" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="exec-decision-list">
      {items.map((item) => (
        <ExecutiveInterventionItem key={item.id} item={item} />
      ))}
    </ul>
  );
}

export function ExecutiveMetricTile({
  label,
  value,
  warn,
}: {
  label: string;
  value: ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={cn('exec-metric-tile', warn && 'exec-metric-tile--warn')}>
      <span className="exec-metric-tile__label">{label}</span>
      <strong className="exec-metric-tile__value">{value}</strong>
    </div>
  );
}

export function ExecutiveLinkRow({ children }: { children: ReactNode }) {
  return <div className="exec-link-row">{children}</div>;
}

export function ExecutiveAdmissionStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: ExecutiveTone;
}) {
  const admTone: Record<ExecutiveTone, string> = {
    blue: 'exec-adm-stat--blue',
    green: 'exec-adm-stat--green',
    amber: 'exec-adm-stat--amber',
    red: 'exec-adm-stat--red',
    neutral: 'exec-adm-stat--neutral',
  };

  return (
    <div className={cn('exec-adm-stat', admTone[tone])}>
      <span className="exec-adm-stat__value">{value}</span>
      <span className="exec-adm-stat__label">{label}</span>
    </div>
  );
}
