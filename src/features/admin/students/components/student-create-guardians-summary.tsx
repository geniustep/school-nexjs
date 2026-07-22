'use client';

import { useT } from '@/features/i18n/locale-context';
import { relationshipTypeLabel } from '../utils/relationship-types';
import { isCompleteStudentCreateGuardianEntry } from '../utils/student-create-additional-guardians';
import { guardianEntryLabel } from '../utils/student-create-guardian-payload';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';

export function StudentCreateGuardiansSummary({
  entries,
  billingGuardianEntryKey,
}: {
  entries: StudentCreateGuardianEntry[];
  billingGuardianEntryKey: string | null;
}) {
  const t = useT();
  const complete = entries.filter(isCompleteStudentCreateGuardianEntry);

  if (complete.length === 0) {
    return (
      <div className="student-create-guardians-summary student-create-guardians-summary--empty" role="status">
        <p className="student-create-guardians-summary__empty-title">
          {t('admin.student360.create.billing.emptyStateTitle')}
        </p>
        <p className="student-create-guardians-summary__empty-lead">
          {t('admin.student360.create.billing.emptyStateLead')}
        </p>
      </div>
    );
  }

  return (
    <section
      className="student-create-guardians-summary"
      aria-label={t('admin.student360.create.billing.summaryAria')}
    >
      <h3 className="student-create-guardians-summary__title">
        {t('admin.student360.create.billing.summaryTitle')}
      </h3>
      <ul className="student-create-guardians-summary__list">
        {complete.map((entry) => {
          const name = guardianEntryLabel(entry);
          const relationship = relationshipTypeLabel(t, entry.relationship_type);
          const phone = entry.phone;
          const isPrimary = entry.is_primary_contact;
          const isBilling = entry.entryKey === billingGuardianEntryKey;
          return (
            <li key={entry.entryKey} className="student-create-guardians-summary__item">
              <div className="student-create-guardians-summary__identity">
                <span className="student-create-guardians-summary__name">{name}</span>
                {relationship ? (
                  <span className="student-create-guardians-summary__relationship">{relationship}</span>
                ) : null}
                {phone ? (
                  <span className="student-create-guardians-summary__phone" dir="ltr">
                    {phone}
                  </span>
                ) : null}
              </div>
              <div className="student-create-guardians-summary__badges">
                {isPrimary ? (
                  <span className="student-create-guardians-summary__badge student-create-guardians-summary__badge--primary">
                    {t('admin.student360.create.billing.primaryBadge')}
                  </span>
                ) : null}
                {isBilling ? (
                  <span className="student-create-guardians-summary__badge student-create-guardians-summary__badge--billing">
                    {t('admin.student360.create.billing.billingBadge')}
                  </span>
                ) : null}
                {entry.kind === 'existing' ? (
                  <span className="student-create-guardians-summary__badge student-create-guardians-summary__badge--linked">
                    {t('admin.student360.create.billing.existingBadge')}
                  </span>
                ) : (
                  <span className="student-create-guardians-summary__badge">
                    {t('admin.student360.create.billing.newBadge')}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
