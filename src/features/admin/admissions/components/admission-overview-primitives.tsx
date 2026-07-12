'use client';

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';

export function OverviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card admissions-overview-card">
      <h2 className="admissions-overview-card__title">{title}</h2>
      <dl className="admissions-overview-card__dl">{children}</dl>
    </section>
  );
}

export function OverviewEmptyValue() {
  const t = useT();
  return (
    <span className="admissions-overview-value--empty">
      {t('admin.admissions.detail.noneValue')}
    </span>
  );
}

function isEmptyValue(value: ReactNode): boolean {
  if (value == null || value === false) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return !trimmed || trimmed.toLowerCase() === 'false';
  }
  return false;
}

export function OverviewValue({ value, dir }: { value: ReactNode; dir?: 'ltr' | 'rtl' | 'auto' }) {
  if (isEmptyValue(value)) {
    return (
      <span dir={dir}>
        <OverviewEmptyValue />
      </span>
    );
  }
  return <span dir={dir}>{value}</span>;
}

export function OverviewRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <div className="admissions-overview-row">
      <dt className="admissions-overview-row__label">{label}</dt>
      <dd className="admissions-overview-row__value">
        <OverviewValue value={value} dir={dir} />
      </dd>
    </div>
  );
}

export function OverviewBlock({ children }: { children: ReactNode }) {
  return <div className="admissions-overview-block">{children}</div>;
}
