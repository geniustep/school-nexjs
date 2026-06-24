'use client';

import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { familyFinanceErrorMessageKey } from '@/lib/utils/normalize-family-finance';
import { useStudentFamilyPlanContext } from '../hooks/use-student-family-finance';

export function FamilyPlanContextCard({
  studentId,
  refreshSignal = 0,
}: {
  studentId: number;
  refreshSignal?: number;
}) {
  const t = useT();
  const { loading, data, error } = useStudentFamilyPlanContext(studentId, true, refreshSignal);

  if (loading && !data) return null;
  if (error) {
    if (error.code === 'family_not_resolved') return null;
    return (
      <div className="student-finance-family-plan-context student-finance-card-alert" role="status">
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
    .join(' · ');

  return (
    <Card className="student-finance-family-plan-context student-finance-section">
      <h4 className="student-finance-family-plan-context__title">
        {t('admin.student360.familyFinance.planContext.title')}
      </h4>
      <p className="student-finance-family-plan-context__lead">
        {t('admin.student360.familyFinance.planContext.lead')}
      </p>
      <dl className="detail-list student-finance-family-plan-context__facts">
        <div>
          <dt>{t('admin.student360.familyFinance.planContext.siblingCount')}</dt>
          <dd>{siblingCount}</dd>
        </div>
        {siblingNames ? (
          <div>
            <dt>{t('admin.student360.familyFinance.planContext.siblingNames')}</dt>
            <dd dir="auto">{siblingNames}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.student360.familyFinance.planContext.activeAgreements')}</dt>
          <dd>
            {data.has_active_sibling_agreements
              ? t('common.yes')
              : t('common.no')}
          </dd>
        </div>
        <div>
          <dt>{t('admin.student360.familyFinance.planContext.familyOverdue')}</dt>
          <dd>
            {data.family_has_overdue ? t('common.yes') : t('common.no')}
          </dd>
        </div>
      </dl>
      {data.eligible_family_discount_hint?.eligible ? (
        <p className="student-finance-family-plan-context__hint tiny muted" role="note">
          {t('admin.student360.familyFinance.planContext.discountHint')}
        </p>
      ) : null}
    </Card>
  );
}
