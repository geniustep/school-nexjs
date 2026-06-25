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
import { resolveSiblingsPanelView } from '@/features/admin/students/utils/siblings-panel-view';
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

export function SiblingsInfoPanel({
  detail,
  layout = 'legacy',
  canManage = false,
  onAddSibling,
}: {
  detail: SiblingsFieldsSource;
  layout?: 'legacy' | 'panel';
  canManage?: boolean;
  onAddSibling?: () => void;
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

  if (layout === 'panel') {
    const view = resolveSiblingsPanelView(detail);

    if (view.isEmpty) {
      return (
        <section
          className="student-siblings-panel card"
          aria-labelledby="student-siblings-panel-title"
        >
          <header className="student-siblings-panel__hero">
            <span className="student-siblings-panel__glyph" aria-hidden="true">
              ◫
            </span>
            <h3 id="student-siblings-panel-title" className="student-siblings-panel__title">
              {t('admin.siblings.sectionTitle')}
            </h3>
          </header>
          <div className="student-siblings-panel__body">
            <div className="student-siblings-panel__empty-state">
              <p className="student-siblings-panel__empty-title">
                {t('admin.siblings.emptyStateTitle')}
              </p>
              <p className="student-siblings-panel__empty-desc">
                {t('admin.siblings.emptyStateDescription')}
              </p>
              {canManage && onAddSibling ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm student-siblings-panel__empty-action"
                  onClick={onAddSibling}
                >
                  {t('admin.siblings.addSiblingAction')}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

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
          {view.registeredCount != null ? (
            <p className="student-siblings-panel__count" dir="auto">
              {t('admin.siblings.countRegistered', { count: view.registeredCount })}
            </p>
          ) : view.flagOnly ? (
            <p className="student-siblings-panel__count" dir="auto">
              {t('admin.siblings.hasSiblingsNote')}
            </p>
          ) : null}

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
