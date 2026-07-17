'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Exact three-line student Spotlight result:
 * 1) [تلميذ] Arabic — Latin
 * 2) Level · Class · Code
 * 3) Profile / Payment / Message actions
 */

import { Avatar } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StudentSearchHit } from '@/types/student-search';
import {
  studentSpotlightAcademicLine,
  studentSpotlightArabicName,
  studentSpotlightIdentityTitle,
  studentSpotlightLatinName,
} from '../utils/student-spotlight-utils';

export function StudentSpotlightResultRow({
  student,
  active,
  showProfile,
  showPayment,
  showMessage,
  onActivate,
  onHover,
  onOpenProfile,
  onOpenPayment,
  onOpenMessage,
}: {
  student: StudentSearchHit;
  active: boolean;
  showProfile: boolean;
  showPayment: boolean;
  showMessage: boolean;
  onActivate: () => void;
  onHover: () => void;
  onOpenProfile: () => void;
  onOpenPayment: () => void;
  onOpenMessage: () => void;
}) {
  const t = useT();
  const arabic = studentSpotlightArabicName(student);
  const latin = studentSpotlightLatinName(student);
  const identityTitle = studentSpotlightIdentityTitle(student);
  const academicLine = studentSpotlightAcademicLine(student);
  const avatarName = arabic || latin || identityTitle || String(student.id);
  const hasActions = showProfile || showPayment || showMessage;

  return (
    <div
      role="option"
      aria-selected={active}
      className={`student-spotlight__option${
        active ? ' student-spotlight__option--active' : ''
      }`}
      onMouseEnter={onHover}
    >
      <Avatar name={avatarName} />
      <div className="student-spotlight__option-main">
        <button
          type="button"
          className="student-spotlight__identity-btn"
          onClick={onActivate}
          aria-label={
            identityTitle
              ? t('admin.spotlight.openProfileNamed', { name: identityTitle })
              : t('admin.spotlight.actions.openProfile')
          }
        >
          <span className="student-spotlight__identity" title={identityTitle || undefined}>
            <span className="student-spotlight__type-badge">{t('admin.spotlight.studentType')}</span>
            <span className="student-spotlight__name" dir="auto">
              {arabic || '—'}
            </span>
            {latin ? (
              <>
                <span className="student-spotlight__name-sep" aria-hidden="true">
                  —
                </span>
                <span className="student-spotlight__name-latin" dir="ltr">
                  {latin}
                </span>
              </>
            ) : null}
          </span>
          {academicLine ? (
            <span className="student-spotlight__meta">
              <span dir="ltr">{academicLine}</span>
            </span>
          ) : null}
        </button>

        {hasActions ? (
          <div className="student-spotlight__actions">
            {showProfile ? (
              <button
                type="button"
                data-spotlight-action="profile"
                className="btn btn--ghost btn--sm student-spotlight__action"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProfile();
                }}
              >
                {t('admin.spotlight.actions.openProfile')}
              </button>
            ) : null}
            {showPayment ? (
              <button
                type="button"
                data-spotlight-action="payment"
                className="btn btn--ghost btn--sm student-spotlight__action"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenPayment();
                }}
              >
                {t('admin.spotlight.actions.payment')}
              </button>
            ) : null}
            {showMessage ? (
              <button
                type="button"
                data-spotlight-action="message"
                className="btn btn--ghost btn--sm student-spotlight__action"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenMessage();
                }}
              >
                {t('admin.spotlight.actions.message')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
