'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import {
  buildStudentCreatePageTitleParts,
  type StudentProfileFormState,
} from '../utils/student-profile';

export function StudentCreatePageHeader({ state }: { state: StudentProfileFormState }) {
  const t = useT();
  const { hasName, ar, latin, showLatin } = useMemo(
    () => buildStudentCreatePageTitleParts(state),
    [state.firstName, state.lastName, state.firstNameLatin, state.lastNameLatin],
  );

  const secondaryName = ar || latin;

  return (
    <header className="student-create-page__header">
      <h1 className="student-create-page__title">{t('admin.student360.create.pageTitle')}</h1>
      {hasName && secondaryName ? (
        <p className="student-create-page__subtitle" dir="auto">
          <span className="student-create-page__subtitle-name">{secondaryName}</span>
          {showLatin && latin ? (
            <span className="student-create-page__title-latin" dir="ltr">
              {latin}
            </span>
          ) : null}
        </p>
      ) : null}
      <p className="student-create-page__desc">{t('admin.student360.create.pageDesc')}</p>
      <p className="student-create-page__family-link">
        <Link href="/admin/students/family/new">
          {t('admin.student360.familyRegistration.entryFromCreate')}
        </Link>
      </p>
    </header>
  );
}
