'use client';

import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '../utils/admission-labels';
import { parseExtraFieldBool } from '../utils/admission-extra-fields';
import { normalizeSiblingLines } from '../utils/sibling-lines';
import {
  localizeSiblingSummary,
  shouldShowSiblingLegacyFields,
} from '../utils/sibling-display';
import { OverviewBlock, OverviewCard, OverviewRow } from './admission-overview-primitives';
import { SiblingLinesCards } from './sibling-lines-cards';
import { SiblingLinesTable } from './sibling-lines-table';
import { resolveSiblingsPanelView } from '@/features/admin/students/utils/siblings-panel-view';
import type { SiblingsFieldsSource } from '@/types/sibling-line';

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
  const hasSiblings = parseExtraFieldBool(detail.has_siblings);
  const siblingLines = normalizeSiblingLines(detail.sibling_lines);
  const summary = localizeSiblingSummary(detail.siblings_summary, t);
  const showLegacy = shouldShowSiblingLegacyFields(detail, siblingLines);
  const rawText = cleanDisplayValue(detail.siblings_raw_text);
  const legacyLevels = cleanDisplayValue(detail.siblings_levels);

  const hasAnyData = Boolean(
    detail.has_siblings != null ||
      detail.sibling_count != null ||
      summary ||
      rawText ||
      legacyLevels ||
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
          ) : null}

          {view.declaredWithoutDetails ? (
            <p className="student-siblings-panel__declared-note" dir="auto">
              {t('admin.siblings.declaredWithoutDetails')}
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
              <h4 className="student-siblings-panel__legacy-title">
                {t('admin.siblings.admissionNotesTitle')}
              </h4>
              {rawText ? (
                <p className="student-siblings-panel__legacy-item" dir="auto">
                  <span className="student-siblings-panel__legacy-label">{t('admin.siblings.rawText')}</span>
                  {rawText}
                </p>
              ) : null}
              {legacyLevels ? (
                <p className="student-siblings-panel__legacy-item" dir="auto">
                  <span className="student-siblings-panel__legacy-label">{t('admin.siblings.legacyLevels')}</span>
                  {legacyLevels}
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
        <OverviewRow label={t('admin.siblings.hasSiblings')} value={null} />
      </OverviewCard>
    );
  }

  return (
    <OverviewCard title={t('admin.siblings.sectionTitle')}>
      <OverviewRow
        label={t('admin.siblings.hasSiblings')}
        value={hasSiblings == null ? null : hasSiblings ? t('common.yes') : t('common.no')}
      />
      {detail.sibling_count != null ? (
        <OverviewRow
          label={t('admin.siblings.siblingCount')}
          value={String(detail.sibling_count)}
          dir="ltr"
        />
      ) : null}
      {summary ? <OverviewRow label={t('admin.siblings.summary')} value={summary} /> : null}
      {showLegacy && rawText ? (
        <OverviewRow label={t('admin.siblings.rawText')} value={rawText} />
      ) : null}
      {showLegacy && legacyLevels ? (
        <OverviewRow label={t('admin.siblings.legacyLevels')} value={legacyLevels} />
      ) : null}
      {siblingLines.length > 0 ? (
        <OverviewBlock>
          <div className="admissions-sibling-lines__desktop">
            <SiblingLinesTable lines={siblingLines} />
          </div>
          <div className="admissions-sibling-lines__mobile">
            <SiblingLinesCards lines={siblingLines} />
          </div>
        </OverviewBlock>
      ) : null}
    </OverviewCard>
  );
}
