'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export function AdminSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('admin-section', className)}>
      <div className="admin-section__head">
        <h2 className="admin-section__title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminCommandHero({
  eyebrow,
  title,
  meta,
  summary,
  kpis,
  primaryAction,
  secondaryAction,
}: {
  eyebrow: string;
  title: string;
  meta: ReactNode;
  summary: string;
  kpis: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <header className="admin-hero">
      <div className="admin-hero__main">
        <span className="admin-hero__eyebrow">{eyebrow}</span>
        <h1 className="admin-hero__title">{title}</h1>
        <div className="admin-hero__meta">{meta}</div>
        <p className="admin-hero__summary">{summary}</p>
        <div className="admin-hero__kpis">{kpis}</div>
      </div>
      <div className="admin-hero__actions">
        {primaryAction}
        {secondaryAction}
      </div>
    </header>
  );
}

export function AdminHeroKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'none';
}) {
  return (
    <span className={cn('admin-hero__kpi', tone && tone !== 'none' && `admin-hero__kpi--${tone}`)}>
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

export function AdminHeroButton({
  href,
  onClick,
  variant = 'primary',
  children,
}: {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  children: ReactNode;
}) {
  const className = cn(
    'admin-hero__btn',
    variant === 'primary' ? 'admin-hero__btn--primary' : 'admin-hero__btn--ghost',
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export function AdminOperationCard({
  title,
  description,
  accent,
  intervention,
  children,
  footer,
}: {
  title: string;
  description?: string;
  accent?: boolean;
  intervention?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'admin-card',
        accent && 'admin-card--accent',
        intervention && 'admin-card--intervention',
      )}
    >
      <div>
        <h3 className="admin-card__title">{title}</h3>
        {description && <p className="admin-card__desc">{description}</p>}
      </div>
      {children}
      {footer}
    </div>
  );
}

export function AdminKpiStrip({
  items,
  foot,
}: {
  items: { key: string; label: string; value: ReactNode; tone?: 'green' | 'red' | 'amber' | 'blue' }[];
  foot?: ReactNode;
}) {
  return (
    <div>
      <div className="admin-kpi-strip">
        {items.map((item) => (
          <div key={item.key} className={cn('admin-kpi', item.tone && `admin-kpi--${item.tone}`)}>
            <span className="admin-kpi__value">{item.value}</span>
            <span className="admin-kpi__label">{item.label}</span>
          </div>
        ))}
      </div>
      {foot && <div className="admin-kpi-strip__foot">{foot}</div>}
    </div>
  );
}

export interface AdminActionItem {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  icon?: string;
  tone?: 'amber' | 'default';
}

export function AdminActionList({ items, emptyLabel }: { items: AdminActionItem[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="admin-empty-hint">{emptyLabel}</p>;
  }
  return (
    <ul className="admin-action-list">
      {items.map((item) => {
        const inner = (
          <>
            {item.icon && <span className="admin-action-item__icon" aria-hidden="true">{item.icon}</span>}
            <span className="admin-action-item__body">
              {item.label}
              {item.hint && <span className="admin-action-item__hint">{item.hint}</span>}
            </span>
          </>
        );
        if (item.href) {
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  'admin-action-item admin-action-item--link',
                  item.tone === 'amber' && 'admin-action-item--amber',
                )}
              >
                {inner}
              </Link>
            </li>
          );
        }
        return (
          <li
            key={item.id}
            className={cn('admin-action-item', item.tone === 'amber' && 'admin-action-item--amber')}
          >
            {inner}
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSchoolStrip({
  cells,
}: {
  cells: { href: string; label: string; value: ReactNode; icon: string }[];
}) {
  return (
    <div className="admin-school-strip">
      {cells.map((cell) => (
        <Link key={cell.href} href={cell.href} className="admin-school-cell">
          <span className="admin-school-cell__icon" aria-hidden="true">{cell.icon}</span>
          <span className="admin-school-cell__value">{cell.value}</span>
          <span className="admin-school-cell__label">{cell.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function AdminQuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link href={href} className="admin-quick-action">
      <span aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
}
