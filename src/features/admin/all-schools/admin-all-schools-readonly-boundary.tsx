'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useOpenSchoolRecord } from './use-open-school-record';
import { useAllSchoolsCopy } from './all-schools-i18n';
import {
  ALL_SCHOOLS_SCOPE_VALUE,
  isAllSchoolsReadMode,
} from '@/lib/admin/all-schools-read-mode';

const ALL_SCHOOLS_READ_PATHS = new Set([
  '/admin/dashboard',
  '/admin/students',
  '/admin/classes',
  '/admin/parents',
]);

function allSchoolsHref(href: string): string {
  const [rawPath, rawQuery = ''] = href.split('?');
  const params = new URLSearchParams(rawQuery);
  params.set('scope', ALL_SCHOOLS_SCOPE_VALUE);
  const query = params.toString();
  return query ? `${rawPath}?${query}` : rawPath;
}

function adminPathFromHref(href: string): string | null {
  if (!href.startsWith('/admin/')) return null;
  return href.split('?')[0].split('#')[0];
}

export function AdminAllSchoolsReadonlyBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const copy = useAllSchoolsCopy();
  const { openRecord } = useOpenSchoolRecord();
  const allSchools = isAllSchoolsReadMode(pathname, searchParams);

  if (!allSchools) return <>{children}</>;

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const recordTarget = target.closest<HTMLElement>('[data-all-schools-record-href]');
    if (recordTarget) {
      const href = recordTarget.dataset.allSchoolsRecordHref;
      const schoolId = Number(recordTarget.dataset.allSchoolsRecordSchoolId);
      if (href && Number.isFinite(schoolId) && schoolId > 0) {
        event.preventDefault();
        event.stopPropagation();
        void openRecord(schoolId, href);
      }
      return;
    }

    const mutationTarget = target.closest<HTMLElement>('[data-all-schools-mutation="true"]');
    if (mutationTarget) {
      event.preventDefault();
      event.stopPropagation();
      toast.warning(copy.chooseSchoolForAction);
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    const adminPath = adminPathFromHref(href);
    if (!adminPath) return;

    event.preventDefault();
    event.stopPropagation();

    if (ALL_SCHOOLS_READ_PATHS.has(adminPath)) {
      router.push(allSchoolsHref(href));
      return;
    }

    toast.warning(copy.chooseSchoolForAction);
  }

  return (
    <div className="admin-all-schools-readonly-boundary" onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}
