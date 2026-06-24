'use client';

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '../utils/admission-labels';
import { parseExtraFieldBool } from '../utils/admission-extra-fields';
import { normalizeSiblingLines } from '../utils/sibling-lines';
import { SiblingLinesTable } from './sibling-lines-table';
import type { SiblingsFieldsSource } from '@/types/sibling-line';

function OverviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card admissions-overview-card">
      <h2 className="admissions-overview-card__title">{title}</h2>
      <div className="admissions-overview-card__body">{children}</div>
    </section>
  );
}

function OverviewRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <dl className="admissions-overview-card__dl admissions-overview-card__dl--row">
      <dt>{label}</dt>
      <dd dir={dir}>{value}</dd>
    </dl>
  );
}

export function SiblingsInfoPanel({ detail }: { detail: SiblingsFieldsSource }) {
  const t = useT();
  const empty = t('admin.siblings.notMentioned');
  const hasSiblings = parseExtraFieldBool(detail.has_siblings);
  const siblingLines = normalizeSiblingLines(detail.sibling_lines);
  const hasAnyData = Boolean(
    detail.has_siblings != null ||
      detail.sibling_count != null ||
      cleanDisplayValue(detail.siblings_summary) ||
      cleanDisplayValue(detail.siblings_raw_text) ||
      cleanDisplayValue(detail.siblings_levels) ||
      siblingLines.length > 0,
  );

  if (!hasAnyData) {
    return (
      <OverviewCard title={t('admin.siblings.sectionTitle')}>
        <p className="admissions-overview-notes muted">{t('admin.siblings.empty')}</p>
      </OverviewCard>
    );
  }

  return (
    <OverviewCard title={t('admin.siblings.sectionTitle')}>
      <OverviewRow
        label={t('admin.siblings.hasSiblings')}
        value={hasSiblings ? t('common.yes') : t('common.no')}
      />
      <OverviewRow
        label={t('admin.siblings.siblingCount')}
        value={detail.sibling_count != null ? detail.sibling_count : empty}
        dir="ltr"
      />
      <OverviewRow
        label={t('admin.siblings.summary')}
        value={cleanDisplayValue(detail.siblings_summary) || empty}
      />
      <OverviewRow
        label={t('admin.siblings.rawText')}
        value={cleanDisplayValue(detail.siblings_raw_text) || empty}
      />
      <OverviewRow
        label={t('admin.siblings.legacyLevels')}
        value={cleanDisplayValue(detail.siblings_levels) || empty}
      />
      {siblingLines.length > 0 ? (
        <div className="admissions-overview-card__table">
          <SiblingLinesTable lines={siblingLines} />
        </div>
      ) : null}
    </OverviewCard>
  );
}
