'use client';

import { useMemo } from 'react';
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

  const displayName = ar || latin;

  return (
    <header className="student-create-page__header">
      <h1 className="student-create-page__title">
        {hasName ? (
          <>
            {t('admin.student360.create.pageTitleNamed', { name: displayName })}
            {showLatin ? (
              <span className="student-create-page__title-latin" dir="ltr">
                {' '}
                {latin}
              </span>
            ) : null}
          </>
        ) : (
          t('admin.addStudent')
        )}
      </h1>
    </header>
  );
}
