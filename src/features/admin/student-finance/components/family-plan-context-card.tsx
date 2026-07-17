'use client';

import { useT } from '@/features/i18n/locale-context';
import { familyFinanceErrorMessageKey } from '@/lib/utils/normalize-family-finance';
import { useStudentFamilyPlanContext } from '../hooks/use-student-family-finance';

export function FamilyPlanContextCard({
  studentId,
  refreshSignal = 0,
  compact = false,
}: {
  studentId: number;
  refreshSignal?: number;
  compact?: boolean;
}) {
  const t = useT();
  const { loading, data, error } = useStudentFamilyPlanContext(studentId, true, refreshSignal);

  if (loading && !data) return null;
  if (error) {
    if (error.code === 'family_not_resolved') return null;
    return (
      <div className="student-finance-family-strip student-finance-family-strip--error" role="status">
        <p>{t(familyFinanceErrorMessageKey(error.code))}</p>
      </div>
    );
  }
  if (!data) return null;

  const siblingCount = data.sibling_count ?? data.siblings.length;
  if (!siblingCount) return null;

  const siblingNames = data.siblings
    .map((sibling) => sibling.student_name?.trim())
    .filter(Boolean)
    .slice(0, compact ? 3 : 8);
  const extraCount = Math.max(0, siblingCount - siblingNames.length);
  const namesLabel = [
    ...siblingNames,
    extraCount > 0 ? t('admin.student360.familyFinance.planContext.moreSiblings', { count: extraCount }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <aside
      className={`student-finance-family-strip${compact ? ' student-finance-family-strip--compact' : ''}`}
      aria-label={t('admin.student360.familyFinance.planContext.title')}
    >
      <div className="student-finance-family-strip__identity">
        <span className="student-finance-family-strip__mark" aria-hidden="true">
          ◈
        </span>
        <div className="student-finance-family-strip__copy">
          <span className="student-finance-family-strip__title">
            {t('admin.student360.familyFinance.planContext.title')}
          </span>
          <span className="student-finance-family-strip__meta" dir="auto">
            {t('admin.student360.familyFinance.planContext.siblingSummary', {
              count: siblingCount,
            })}
            {namesLabel ? ` — ${namesLabel}` : ''}
          </span>
        </div>
      </div>

      <div className="student-finance-family-strip__flags">
        <span
          className={`student-finance-family-strip__chip${
            data.has_active_sibling_agreements ? ' is-positive' : ''
          }`}
        >
          {data.has_active_sibling_agreements
            ? t('admin.student360.familyFinance.planContext.activeAgreementsYes')
            : t('admin.student360.familyFinance.planContext.activeAgreementsNo')}
        </span>
        <span
          className={`student-finance-family-strip__chip${
            data.family_has_overdue ? ' is-warning' : ''
          }`}
        >
          {data.family_has_overdue
            ? t('admin.student360.familyFinance.planContext.familyOverdueYes')
            : t('admin.student360.familyFinance.planContext.familyOverdueNo')}
        </span>
        {data.eligible_family_discount_hint?.eligible ? (
          <span className="student-finance-family-strip__chip is-info">
            {t('admin.student360.familyFinance.planContext.discountHintShort')}
          </span>
        ) : null}
      </div>
    </aside>
  );
}
