'use client';

import Link from 'next/link';
import { PageHeader, Card } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { adminAcademicHubLinksForUser } from '@/lib/permissions/admin-pages';
import { useT } from '@/features/i18n/locale-context';
import { EmptyState } from '@/components/states/states';

export default function AdminAcademicPage() {
  const t = useT();
  const user = useSession();
  const links = adminAcademicHubLinksForUser(user);

  return (
    <>
      <PageHeader title={t('admin.academicCenter')} subtitle={t('admin.academicCenterDesc')} />
      {links.length === 0 ? (
        <EmptyState
          title={t('errors.forbiddenTitle')}
          description={t('admin.pageForbidden')}
        />
      ) : (
        <div className="grid grid--cards">
          {links.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="row-link">
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <strong className="mt-2">{t(item.labelKey)}</strong>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
