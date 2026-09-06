'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, useState } from 'react';
import { useLocale, type TranslateFn } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';
import { formatCardStatCount } from '@/lib/i18n/count-plural';
import type { FeeType } from '@/types/finance';
import type { StudentsListServicePresence } from '../utils/students-list-url';
import {
  sliceVisibleServiceCounts,
  STUDENTS_SERVICE_COUNTS_INITIAL_VISIBLE,
  type StudentsFinancialServiceCountItem,
} from '../utils/students-financial-service-counts';
import {
  resolveStudentsServiceCountTone,
  studentsServiceCountToneClass,
} from '../utils/students-service-count-tones';

const SERVICE_CATEGORY_LABEL_KEYS: Record<string, string> = {
  registration: 'admin.studentsList.serviceCategory.registration',
  tuition: 'admin.studentsList.serviceCategory.tuition',
  transport: 'admin.studentsList.serviceCategory.transport',
  canteen: 'admin.studentsList.serviceCategory.canteen',
  meals: 'admin.studentsList.serviceCategory.meals',
  activities: 'admin.studentsList.serviceCategory.activities',
  activity: 'admin.studentsList.serviceCategory.activity',
  books: 'admin.studentsList.serviceCategory.books',
};

const LEGACY_SERVICE_NAME_TO_CATEGORY: Record<string, string> = {
  'التسجيل': 'registration',
  'رسوم التسجيل': 'registration',
  'التمدرس': 'tuition',
  'واجبات التمدرس': 'tuition',
  'النقل': 'transport',
  'نقل': 'transport',
  'المطعم': 'canteen',
  'الوجبات': 'meals',
  'الكتب': 'books',
  'الأنشطة': 'activities',
};

function serviceDisplayName(
  t: TranslateFn,
  item: StudentsFinancialServiceCountItem,
  feeType: FeeType | undefined,
): string {
  const explicitCategory = feeType?.category?.trim().toLowerCase();
  const legacyCategory = LEGACY_SERVICE_NAME_TO_CATEGORY[item.name.trim()];
  const category =
    explicitCategory && SERVICE_CATEGORY_LABEL_KEYS[explicitCategory]
      ? explicitCategory
      : legacyCategory;
  const key = category ? SERVICE_CATEGORY_LABEL_KEYS[category] : undefined;
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  return feeType?.name?.trim() || item.name.trim() || item.code?.trim() || '—';
}

function serviceGlyph(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '·';
  return trimmed.charAt(0);
}

function studentCountLabel(t: TranslateFn, locale: Locale, count: number): string {
  return formatCardStatCount(t, locale, 'student', count);
}

function hasServiceCountLabel(t: TranslateFn, locale: Locale, count: number): string {
  return t('admin.studentsList.serviceCounts.hasCountLabel', {
    count: studentCountLabel(t, locale, count),
  });
}

export type StudentsFinancialServiceCountCardsProps = {
  items: StudentsFinancialServiceCountItem[];
  feeTypes?: FeeType[];
  totalStudents: number;
  initialLoading: boolean;
  fetching?: boolean;
  error: { message?: string } | null;
  serviceId: string;
  servicePresence: StudentsListServicePresence | '';
  onSelectAll: () => void;
  onSelectService: (serviceId: string) => void;
  onRetry: () => void;
  readOnly?: boolean;
};

export function StudentsFinancialServiceCountCards({
  items,
  feeTypes = [],
  totalStudents,
  initialLoading,
  fetching = false,
  error,
  serviceId,
  servicePresence,
  onSelectAll,
  onSelectService,
  onRetry,
  readOnly = false,
}: StudentsFinancialServiceCountCardsProps) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState(false);

  const visibleItems = useMemo(
    () => sliceVisibleServiceCounts(items, expanded),
    [items, expanded],
  );
  const feeTypeById = useMemo(
    () => new Map(feeTypes.map((feeType) => [feeType.id, feeType])),
    [feeTypes],
  );
  const canExpand = items.length > STUDENTS_SERVICE_COUNTS_INITIAL_VISIBLE;
  const allSelected = !serviceId;
  const clarifyHasCount = servicePresence === 'not_has';

  if (readOnly) {
    return (
      <section
        className="students-service-counts"
        aria-label={t('admin.studentsList.serviceCounts.title')}
      >
        <header className="students-service-counts__header">
          <h2 className="students-service-counts__title">
            {t('admin.studentsList.serviceCounts.title')}
          </h2>
          <p className="students-service-counts__hint muted">
            {t('admin.studentsList.serviceCounts.hint')}
          </p>
        </header>
        <div className="students-service-counts__grid">
          <button
            type="button"
            className="students-service-counts__card students-service-counts__card--all students-service-counts__card--tone-neutral students-service-counts__card--active"
            aria-pressed="true"
            aria-disabled="true"
            data-all-schools-mutation="true"
          >
            <span className="students-service-counts__glyph" aria-hidden="true">∗</span>
            <span className="students-service-counts__body">
              <span className="students-service-counts__name">
                {t('admin.studentsList.serviceCounts.allStudents')}
              </span>
              <span className="students-service-counts__count">
                {studentCountLabel(t, locale, totalStudents)}
              </span>
            </span>
            <span className="students-service-counts__selected">
              {t('admin.studentsList.serviceCounts.selected')}
            </span>
          </button>
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className="students-service-counts__card students-service-counts__card--tone-neutral"
              aria-disabled="true"
            >
              <span className="students-service-counts__glyph" aria-hidden="true">·</span>
              <span className="students-service-counts__body">
                <span className="students-service-counts__name">—</span>
                <span className="students-service-counts__count">—</span>
              </span>
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (initialLoading) {
    return (
      <section
        className="students-service-counts"
        aria-busy="true"
        aria-label={t('admin.studentsList.serviceCounts.title')}
      >
        <header className="students-service-counts__header">
          <h2 className="students-service-counts__title">
            {t('admin.studentsList.serviceCounts.title')}
          </h2>
          <p className="students-service-counts__hint muted">
            {t('admin.studentsList.serviceCounts.hint')}
          </p>
        </header>
        <div className="students-service-counts__grid" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="students-service-counts__skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (error && items.length === 0) {
    return (
      <section
        className="students-service-counts students-service-counts--error"
        aria-label={t('admin.studentsList.serviceCounts.title')}
      >
        <header className="students-service-counts__header">
          <h2 className="students-service-counts__title">
            {t('admin.studentsList.serviceCounts.title')}
          </h2>
        </header>
        <div className="students-service-counts__error" role="alert">
          <p className="students-service-counts__error-msg">
            {t('admin.studentsList.serviceCounts.error')}
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('admin.studentsList.serviceCounts.retry')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        fetching
          ? 'students-service-counts students-service-counts--fetching'
          : 'students-service-counts'
      }
      aria-busy={fetching || undefined}
      aria-label={t('admin.studentsList.serviceCounts.title')}
    >
      <header className="students-service-counts__header">
        <h2 className="students-service-counts__title">
          {t('admin.studentsList.serviceCounts.title')}
        </h2>
        <p className="students-service-counts__hint muted">
          {t('admin.studentsList.serviceCounts.hint')}
        </p>
        {clarifyHasCount && serviceId ? (
          <p className="students-service-counts__presence-badge" role="status">
            {t('admin.studentsList.serviceCounts.notHasFilterBadge')}
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="students-service-counts__error students-service-counts__error--inline" role="status">
          <p className="students-service-counts__error-msg">
            {t('admin.studentsList.serviceCounts.error')}
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('admin.studentsList.serviceCounts.retry')}
          </button>
        </div>
      ) : null}

      <div className="students-service-counts__grid">
        <button
          type="button"
          className={[
            'students-service-counts__card',
            'students-service-counts__card--all',
            'students-service-counts__card--tone-neutral',
            allSelected ? 'students-service-counts__card--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={allSelected}
          data-service-card="all"
          onClick={onSelectAll}
        >
          <span className="students-service-counts__glyph" aria-hidden="true">
            ∗
          </span>
          <span className="students-service-counts__body">
            <span className="students-service-counts__name">
              {t('admin.studentsList.serviceCounts.allStudents')}
            </span>
            <span className="students-service-counts__count">
              {studentCountLabel(t, locale, totalStudents)}
            </span>
          </span>
          {allSelected ? (
            <span className="students-service-counts__selected">
              {t('admin.studentsList.serviceCounts.selected')}
            </span>
          ) : null}
        </button>

        {visibleItems.map((item, index) => {
          const id = String(item.service_id);
          const active = serviceId === id;
          const zero = item.student_count === 0;
          const tone = resolveStudentsServiceCountTone(item.code, index);
          const countText =
            clarifyHasCount && active
              ? hasServiceCountLabel(t, locale, item.student_count)
              : studentCountLabel(t, locale, item.student_count);
          const displayName = serviceDisplayName(t, item, feeTypeById.get(item.service_id));

          return (
            <button
              key={item.service_id}
              type="button"
              className={[
                'students-service-counts__card',
                studentsServiceCountToneClass(tone),
                active ? 'students-service-counts__card--active' : '',
                zero ? 'students-service-counts__card--zero' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={active}
              data-service-id={id}
              data-service-code={item.code ?? ''}
              onClick={() => onSelectService(id)}
            >
              <span className="students-service-counts__glyph" aria-hidden="true">
                {serviceGlyph(displayName)}
              </span>
              <span className="students-service-counts__body">
                <span className="students-service-counts__name" title={displayName} dir="auto">
                  {displayName}
                </span>
                <span className="students-service-counts__count">{countText}</span>
              </span>
              {active ? (
                <span className="students-service-counts__selected">
                  {t('admin.studentsList.serviceCounts.selected')}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {canExpand ? (
        <div className="students-service-counts__more">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? t('admin.studentsList.serviceCounts.showLess')
              : t('admin.studentsList.serviceCounts.showAll', {
                  count: items.length,
                })}
          </button>
        </div>
      ) : null}
    </section>
  );
}
