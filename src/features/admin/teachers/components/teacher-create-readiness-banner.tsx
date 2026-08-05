'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status draft
 */

import Link from 'next/link';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherCreateResult } from '@/types/teacher';
import '@/features/admin/teachers/teachers-domain.css';

export function TeacherCreateReadinessBanner({
  result,
  onDismiss,
}: {
  result: TeacherCreateResult;
  onDismiss?: () => void;
}) {
  const t = useT();
  const assignmentsCount = result.lifecycle.assignments_count;
  const canLogin = result.lifecycle.can_login === true || result.account.can_login === true;
  const hasAccount = result.lifecycle.has_account === true || result.account.created === true;
  const needsPasswordSetup =
    hasAccount &&
    !canLogin &&
    (result.account.status === 'password_setup_required' || !result.account.password_was_set);

  const accountLine = hasAccount
    ? t('admin.academicSetup.teacherCreate.readiness.accountCreated')
    : t('admin.academicSetup.teacherCreate.readiness.accountUnknown');

  const loginLine = canLogin
    ? t('admin.academicSetup.teacherCreate.readiness.canLogin')
    : needsPasswordSetup
      ? t('admin.academicSetup.teacherCreate.readiness.passwordSetupRequired')
      : t('admin.academicSetup.teacherCreate.readiness.cannotLogin');

  const assignmentsLine =
    assignmentsCount > 0
      ? t('admin.academicSetup.teacherCreate.readiness.assignmentsCount', {
          count: assignmentsCount,
        })
      : t('admin.academicSetup.teacherCreate.readiness.noAssignments');

  return (
    <div data-testid="teacher-create-readiness">
      <Card className="teacher-create-readiness">
      <SectionHead title={t('admin.academicSetup.teacherCreate.readiness.title')} />
      <ul className="teacher-create-readiness__list">
        <li>{t('admin.academicSetup.teacherCreate.readiness.teacherCreated')}</li>
        <li>{accountLine}</li>
        <li>{loginLine}</li>
        <li>{assignmentsLine}</li>
      </ul>

      {!canLogin && needsPasswordSetup ? (
        <p className="teacher-create-readiness__next muted">
          {t('admin.academicSetup.teacherCreate.readiness.passwordSetupNext')}
        </p>
      ) : null}

      {assignmentsCount <= 0 ? (
        <p className="teacher-create-readiness__next">
          <Link
            href={`/admin/teachers/${result.teacher_id}?tab=assignments`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.academicSetup.teacherCreate.readiness.addAssignment')}
          </Link>
        </p>
      ) : (
        <p className="teacher-create-readiness__next muted">
          {t('admin.academicSetup.teacherCreate.readiness.assignmentsReadyHint')}
        </p>
      )}

      <div className="row teacher-create-readiness__actions" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Link href="/admin/teachers/new" className="btn btn--primary btn--sm">
          {t('admin.academicSetup.teacherCreate.readiness.addAnother')}
        </Link>
        {onDismiss ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
            {t('common.close')}
          </button>
        ) : null}
      </div>
      </Card>
    </div>
  );
}
