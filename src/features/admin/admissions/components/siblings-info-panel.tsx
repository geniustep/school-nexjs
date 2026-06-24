'use client';

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '../utils/admission-labels';
import { parseExtraFieldBool } from '../utils/admission-extra-fields';
import { normalizeSiblingLines } from '../utils/sibling-lines';
import {
  localizeSiblingSummary,
  shouldShowSiblingLegacyFields,
} from '../utils/sibling-display';
import { SiblingLinesCards } from './sibling-lines-cards';
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

function PanelChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="student-aside-chip">
      <span className="student-aside-chip__label">{label}</span>
      <span className="student-aside-chip__value" dir="auto">
        {value}
      </span>
    </div>
  );
}

export function SiblingsInfoPanel({
  detail,
  layout = 'legacy',
}: {
  detail: SiblingsFieldsSource;
  layout?: 'legacy' | 'panel';
}) {
  const t = useT();
  const empty = t('admin.siblings.notMentioned');
  const hasSiblings = parseExtraFieldBool(detail.has_siblings);
  const siblingLines = normalizeSiblingLines(detail.sibling_lines);
  const summary = localizeSiblingSummary(detail.siblings_summary, t);
  const showLegacy = shouldShowSiblingLegacyFields(detail, siblingLines);

  const hasAnyData = Boolean(
    detail.has_siblings != null ||
      detail.sibling_count != null ||
      summary ||
      cleanDisplayValue(detail.siblings_raw_text) ||
      cleanDisplayValue(detail.siblings_levels) ||
      siblingLines.length > 0,
  );

  if (!hasAnyData) {
    if (layout === 'panel') {
      return (
        <section className="student-siblings-panel card" aria-labelledby="student-siblings-panel-title">
          <header className="student-siblings-panel__hero">
            <span className="student-siblings-panel__glyph" aria-hidden="true">
              ◫
            </span>
            <h3 id="student-siblings-panel-title" className="student-siblings-panel__title">
              {t('admin.siblings.sectionTitle')}
            </h3>
          </header>
          <div className="student-siblings-panel__body">
            <p className="student-siblings-panel__empty">{t('admin.siblings.empty')}</p>
          </div>
        </section>
      );
    }
    return (
      <OverviewCard title={t('admin.siblings.sectionTitle')}>
        <p className="admissions-overview-notes muted">{t('admin.siblings.empty')}</p>
      </OverviewCard>
    );
  }

  if (layout === 'panel') {
    return (
      <section className="student-siblings-panel card" aria-labelledby="student-siblings-panel-title">
        <header className="student-siblings-panel__hero">
          <span className="student-siblings-panel__glyph" aria-hidden="true">
            ◫
          </span>
          <h3 id="student-siblings-panel-title" className="student-siblings-panel__title">
            {t('admin.siblings.sectionTitle')}
          </h3>
        </header>

        <div className="student-siblings-panel__body">
          <div className="student-aside-chip-grid student-aside-chip-grid--2">
            <PanelChip
              label={t('admin.siblings.hasSiblings')}
              value={hasSiblings ? t('common.yes') : t('common.no')}
            />
            {detail.sibling_count != null ? (
              <PanelChip label={t('admin.siblings.siblingCount')} value={detail.sibling_count} />
            ) : null}
          </div>

          {summary && siblingLines.length === 0 ? (
            <p className="student-siblings-panel__summary" dir="auto">
              {summary}
            </p>
          ) : null}

          {siblingLines.length > 0 ? (
            <div className="student-siblings-panel__lines">
              <h4 className="student-siblings-panel__lines-title">{t('admin.siblings.detailsTitle')}</h4>
              <SiblingLinesCards lines={siblingLines} />
            </div>
          ) : null}

          {showLegacy ? (
            <div className="student-siblings-panel__legacy">
              {cleanDisplayValue(detail.siblings_raw_text) ? (
                <p className="student-siblings-panel__legacy-item" dir="auto">
                  <span className="student-siblings-panel__legacy-label">{t('admin.siblings.rawText')}</span>
                  {cleanDisplayValue(detail.siblings_raw_text)}
                </p>
              ) : null}
              {cleanDisplayValue(detail.siblings_levels) ? (
                <p className="student-siblings-panel__legacy-item" dir="auto">
                  <span className="student-siblings-panel__legacy-label">{t('admin.siblings.legacyLevels')}</span>
                  {cleanDisplayValue(detail.siblings_levels)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
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
      <OverviewRow label={t('admin.siblings.summary')} value={summary || empty} />
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
          <div className="admissions-sibling-lines__desktop">
            <SiblingLinesTable lines={siblingLines} />
          </div>
          <div className="admissions-sibling-lines__mobile">
            <SiblingLinesCards lines={siblingLines} />
          </div>
        </div>
      ) : null}
    </OverviewCard>
  );
}
