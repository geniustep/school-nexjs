'use client';

import Link from 'next/link';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  canAssignFees,
  canCollectPayments,
  canManageFeeCatalog,
  canManageFeePlans,
  canViewFinanceSetup,
} from '@/lib/permissions/finance';
import { FINANCE_JOURNAL_LOOKUP_AVAILABLE } from '@/features/admin/finance/use-finance-lookups';

type HubLink = {
  href: string;
  icon: string;
  labelKey: 'admin.finance.hubStudentFees' | 'admin.finance.hubCollections' | 'admin.finance.hubFeeTypes' | 'admin.finance.hubFeePlans' | 'admin.finance.hubRecordCollection';
  descKey: 'admin.finance.hubStudentFeesDesc' | 'admin.finance.hubCollectionsDesc' | 'admin.finance.hubFeeTypesDesc' | 'admin.finance.hubFeePlansDesc' | 'admin.finance.hubRecordCollectionDesc';
  show: boolean;
};

export function FinanceHubLinks() {
  const user = useSession();
  const t = useT();

  const links: HubLink[] = [
    {
      href: '/admin/finance/student-fees',
      icon: '📋',
      labelKey: 'admin.finance.hubStudentFees',
      descKey: 'admin.finance.hubStudentFeesDesc',
      show: true,
    },
    {
      href: '/admin/finance/collections',
      icon: '💵',
      labelKey: 'admin.finance.hubCollections',
      descKey: 'admin.finance.hubCollectionsDesc',
      show: true,
    },
    {
      href: '/admin/finance/collections/new',
      icon: '➕',
      labelKey: 'admin.finance.hubRecordCollection',
      descKey: 'admin.finance.hubRecordCollectionDesc',
      show: canCollectPayments(user) && FINANCE_JOURNAL_LOOKUP_AVAILABLE,
    },
    {
      href: '/admin/finance/fee-types',
      icon: '🏷️',
      labelKey: 'admin.finance.hubFeeTypes',
      descKey: 'admin.finance.hubFeeTypesDesc',
      show: canViewFinanceSetup(user) || canManageFeeCatalog(user),
    },
    {
      href: '/admin/finance/fee-plans',
      icon: '📅',
      labelKey: 'admin.finance.hubFeePlans',
      descKey: 'admin.finance.hubFeePlansDesc',
      show: canViewFinanceSetup(user) || canManageFeePlans(user),
    },
  ];

  const visible = links.filter((l) => l.show);
  if (!visible.length) return null;

  return (
    <div className="finance-hub-grid">
      {visible.map((link) => (
        <Link key={link.href} href={link.href} className="card finance-hub-card">
          <span className="finance-hub-icon" aria-hidden>
            {link.icon}
          </span>
          <strong>{t(link.labelKey)}</strong>
          <p className="muted">{t(link.descKey)}</p>
        </Link>
      ))}
      {canAssignFees(user) && (
        <p className="muted finance-hub-note">{t('admin.finance.assignViaProfileNote')}</p>
      )}
    </div>
  );
}
