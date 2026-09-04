'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useAllSchoolsCopy } from './all-schools-i18n';
import { switchSchoolThenOpen } from './open-school-record';

export function useOpenSchoolRecord() {
  const router = useRouter();
  const toast = useToast();
  const copy = useAllSchoolsCopy();
  const { activeSchoolId, setActiveSchool, switching } = useAdminSession();
  const [openingHref, setOpeningHref] = useState<string | null>(null);

  const openRecord = useCallback(
    async (schoolId: number | null | undefined, href: string): Promise<boolean> => {
      if (openingHref || switching) return false;
      setOpeningHref(href);
      try {
        const result = await switchSchoolThenOpen({
          schoolId,
          activeSchoolId,
          switchSchool: setActiveSchool,
          navigate: () => router.push(href),
        });
        if (result !== 'opened') {
          toast.error(copy.switchFailed);
          return false;
        }
        return true;
      } finally {
        setOpeningHref(null);
      }
    },
    [activeSchoolId, copy.switchFailed, openingHref, router, setActiveSchool, switching, toast],
  );

  return {
    openRecord,
    opening: openingHref != null || switching,
  };
}
