'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import type { GuardianDuplicateField, GuardianDuplicateMatch } from '@/types/student-360';

export function GuardianDuplicateAlert({
  field,
  matches,
  onLinkExisting,
  onEditInput,
}: {
  field: GuardianDuplicateField;
  matches: GuardianDuplicateMatch[];
  onLinkExisting: (guardian: GuardianDuplicateMatch) => void;
  onEditInput: () => void;
}) {
  const t = useT();
  const titleKey =
    field === 'email'
      ? 'admin.student360.guardianDuplicateEmail'
      : field === 'phone'
        ? 'admin.student360.guardianDuplicatePhone'
        : 'admin.student360.guardianDuplicateIdentity';

  return (
    <div className="guardian-duplicate-alert" role="alert">
      <p className="guardian-duplicate-alert__title">{t(titleKey)}</p>
      <ul className="guardian-duplicate-alert__list">
        {matches.map((match) => (
          <li key={match.id} className="guardian-duplicate-alert__item">
            <div className="guardian-duplicate-alert__body">
              <strong className="guardian-duplicate-alert__name">{match.name}</strong>
              {match.phone ? (
                <span className="tiny mono" dir="ltr">
                  {t('admin.phone')}: {formatMoroccanPhoneDisplay(match.phone)}
                </span>
              ) : null}
              {match.email ? (
                <span className="tiny" dir="ltr">
                  {t('admin.email')}: {match.email}
                </span>
              ) : null}
            </div>
            <div className="guardian-duplicate-alert__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onLinkExisting(match)}
              >
                {t('admin.student360.linkExistingGuardian')}
              </button>
              <Link href={`/admin/parents/${match.id}`} className="btn btn--ghost btn--sm">
                {t('admin.student360.guardiansOpenProfile')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onEditInput}>
        {t('admin.student360.editEnteredData')}
      </button>
    </div>
  );
}
