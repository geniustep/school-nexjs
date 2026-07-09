'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import '@/features/admin/academic-setup/academic-setup-ui.css';
import { PageHeader } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { adminAcademicHubLinksForUser } from '@/lib/permissions/admin-pages';
import { useT } from '@/features/i18n/locale-context';
import { EmptyState } from '@/components/states/states';
import {
  ADMIN_HUB_CARD_CLASS,
  ADMIN_HUB_CARD_ICON_CLASS,
  ADMIN_HUB_GRID_CLASS,
  academicHubLinkDescKey,
  hasAdminHubLinks,
} from '@/features/admin/hubs/academic-hub-present';

export default function AdminAcademicPage() {
  const t = useT();
  const user = useSession();
  const links = adminAcademicHubLinksForUser(user);

  return (
    <div className="admin-workspace">
      <PageHeader title={t('admin.academicCenter')} subtitle={t('admin.academicCenterDesc')} />
      {!hasAdminHubLinks(links.length) ? (
        <EmptyState
          title={t('errors.forbiddenTitle')}
          description={t('admin.pageForbidden')}
        />
      ) : (
        <div className={ADMIN_HUB_GRID_CLASS}>
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={ADMIN_HUB_CARD_CLASS}>
              <span className={ADMIN_HUB_CARD_ICON_CLASS} aria-hidden>
                {item.icon}
              </span>
              <strong>{t(item.labelKey)}</strong>
              <p className="muted">{t(academicHubLinkDescKey(item.href))}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
