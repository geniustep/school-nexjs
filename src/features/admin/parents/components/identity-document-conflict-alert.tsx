'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import {
  identityConflictCandidateLabel,
} from '../utils/map-parent-api-error';
import type { GuardianDuplicateMatch } from '@/types/student-360';

export function IdentityDocumentConflictAlert({
  candidates,
  onSelectExisting,
}: {
  candidates: GuardianDuplicateMatch[];
  onSelectExisting?: (candidate: GuardianDuplicateMatch) => void;
}) {
  const t = useT();
  if (!candidates.length) return null;

  return (
    <div className="identity-document-conflict" role="alert">
      <p className="identity-document-conflict__title">
        {t('admin.identityDocument.duplicateExists')}
      </p>
      <ul className="identity-document-conflict__list">
        {candidates.map((candidate) => {
          const label = identityConflictCandidateLabel(candidate);
          return (
            <li key={candidate.id} className="identity-document-conflict__item">
              <div className="identity-document-conflict__body">
                <strong dir="auto">{label.name}</strong>
                {label.maskedIdentity ? (
                  <span className="tiny mono" dir="ltr">
                    {t('admin.identityDocument.maskedLabel')}: {label.maskedIdentity}
                  </span>
                ) : null}
              </div>
              <div className="identity-document-conflict__actions">
                {onSelectExisting ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => onSelectExisting(candidate)}
                  >
                    {t('admin.identityDocument.useExisting')}
                  </button>
                ) : null}
                <Link href={label.href} className="btn btn--ghost btn--sm">
                  {t('admin.identityDocument.openExisting')}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
