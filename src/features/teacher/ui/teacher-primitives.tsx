'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { EmptyState } from '@/components/states/states';
import { Badge } from '@/components/ui/primitives';

/* ── Page header ── */
export function TeacherPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="t-page-header">
      <div className="t-page-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="t-page-header__actions">{actions}</div>}
    </header>
  );
}

/* ── Stat card ── */
export type TeacherStatTone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'none';

export function TeacherStatCard({
  label,
  value,
  icon,
  tone = 'none',
  href,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: TeacherStatTone;
  href?: string;
}) {
  const inner = (
    <div className={cn('t-stat', tone !== 'none' && `t-stat--${tone}`)}>
      {icon && <span className="t-stat__icon" aria-hidden="true">{icon}</span>}
      <div className="t-stat__body">
        <span className="t-stat__label">{label}</span>
        <span className="t-stat__value">{value}</span>
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="t-stat-link">
        {inner}
      </Link>
    );
  }
  return inner;
}

/* ── Workspace card ── */
export function TeacherWorkspaceCard({
  title,
  icon,
  action,
  children,
  className,
  pad = true,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={cn('t-ws-card', !pad && 't-ws-card--flush', className)}>
      {(title || action) && (
        <div className="t-ws-card__head">
          {title && (
            <h2 className="t-ws-card__title">
              {icon && <span className="t-ws-card__icon" aria-hidden="true">{icon}</span>}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="t-ws-card__body">{children}</div>
    </section>
  );
}

/* ── Section ── */
export function TeacherSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="t-section">
      <div className="t-section__head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── Empty state ── */
export function TeacherEmptyState({
  icon,
  title,
  description,
  compact,
}: {
  icon?: string;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className="t-empty">
      <EmptyState compact={compact} icon={icon} title={title} description={description} />
    </div>
  );
}

/* ── Segmented tabs ── */
export interface TeacherTabItem {
  key: string;
  label: string;
  icon?: string;
  href: string;
}

export function TeacherSegmentedTabs({
  items,
  activeKey,
  ariaLabel,
}: {
  items: TeacherTabItem[];
  activeKey: string;
  ariaLabel?: string;
}) {
  return (
    <nav className="t-seg-tabs" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn('t-seg-tabs__item', isActive && 't-seg-tabs__item--active')}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon && (
              <span className="t-seg-tabs__icon" aria-hidden="true">{item.icon}</span>
            )}
            <span className="t-seg-tabs__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Content toolbar ── */
export function TeacherContentToolbar({ children }: { children: ReactNode }) {
  return <div className="t-content-toolbar">{children}</div>;
}

/* ── Content card ── */
export function TeacherContentCard({
  href,
  title,
  badge,
  meta,
  footer,
  onClick,
}: {
  href?: string;
  title: string;
  badge?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="t-content-card__head">
        <strong className="t-content-card__title">{title}</strong>
        {badge}
      </div>
      {meta && <div className="t-content-card__meta">{meta}</div>}
      {footer && <div className="t-content-card__footer">{footer}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="t-content-card t-content-card--link">
        {inner}
      </Link>
    );
  }

  return (
    <div className={cn('t-content-card', onClick && 't-content-card--clickable')} onClick={onClick}>
      {inner}
    </div>
  );
}

/* ── Command hero ── */
export function TeacherCommandHero({
  greeting,
  schoolName,
  roleBadge,
  dateLabel,
  children,
  cta,
}: {
  greeting: string;
  schoolName?: string;
  roleBadge?: string;
  dateLabel?: string;
  children?: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <div className="t-hero">
      <div className="t-hero__pattern" aria-hidden="true" />
      <div className="t-hero__inner">
        <div className="t-hero__main">
          <p className="t-hero__greeting">{greeting}</p>
          <div className="t-hero__meta">
            {schoolName && <span className="t-hero__school">{schoolName}</span>}
            {roleBadge && <Badge tone="blue">{roleBadge}</Badge>}
            {dateLabel && <span className="t-hero__date">{dateLabel}</span>}
          </div>
          {children && <div className="t-hero__slot">{children}</div>}
        </div>
        {cta && <div className="t-hero__cta">{cta}</div>}
      </div>
    </div>
  );
}

/* ── Quick action chip ── */
export function TeacherQuickChip({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link href={href} className="t-chip">
      <span aria-hidden="true">{icon}</span>
      {label}
    </Link>
  );
}

/* ── Message feed item ── */
export function TeacherMessageItem({
  channel,
  sender,
  body,
  time,
}: {
  channel: string;
  sender: string;
  body: string;
  time: string;
}) {
  return (
    <div className="t-msg">
      <div className="t-msg__head">
        <span className="t-msg__channel">{channel}</span>
        <span className="t-msg__time">{time}</span>
      </div>
      <div className="t-msg__sender">{sender}</div>
      <div className="t-msg__body">{body}</div>
    </div>
  );
}
