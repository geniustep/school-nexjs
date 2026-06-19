'use client';

import { formatCustomizationReason } from '@/features/admin/students/utils/enrollment-finance-payload';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import {
  formatEnrollmentCustomizationLabel,
  type DraftAgreementPresentation,
} from '../utils/resolve-draft-agreement-presentation';

export function AgreementEnrollmentCustomizationsSection({
  presentation,
}: {
  presentation: DraftAgreementPresentation;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const items = presentation.enrollmentCustomizations;

  if (!items.length) return null;

  const formatReason = (reason: string) => formatCustomizationReason(reason, t);

  return (
    <section className="student-finance-section student-finance-enrollment-customizations">
      <Student360SectionHeader
        title={t('admin.student360.financialAgreement.enrollmentCustomizations.title')}
        description={t('admin.student360.financialAgreement.enrollmentCustomizations.description')}
      />
      <ul className="student-finance-enrollment-customizations__list">
        {items.map((item, index) => (
          <li key={`${item.scope ?? 'custom'}-${item.line_id ?? index}`}>
            {formatEnrollmentCustomizationLabel(item, t, formatDate, formatReason)}
          </li>
        ))}
      </ul>
    </section>
  );
}
