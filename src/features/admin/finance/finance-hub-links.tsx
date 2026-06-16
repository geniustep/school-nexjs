'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  IconBookOpen,
  IconCheckCircle,
  IconClipboard,
  IconLayers,
  IconSlidersHorizontal,
} from '@/components/icons/admin-icons';
import {
  canViewCheques,
  canViewFinanceAgreements,
  canViewFinanceInstallments,
  canViewFinanceServices,
  canViewFinanceSetup,
  canViewPayments,
} from '@/lib/permissions/finance';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import { financeDeepLinkHref } from '@/features/admin/finance/finance-deep-links';
import type { AdminFinanceOverview } from '@/types/finance';

type HubLinkBadge = {
  labelKey: string;
  count: number;
};

type HubLink = {
  href: string;
  icon: ReactNode;
  labelKey: string;
  descKey: string;
  badge?: HubLinkBadge | null;
  show: boolean;
};

export function FinanceHubLinks({ overview }: { overview: AdminFinanceOverview | null }) {
  const user = useSession();
  const t = useT();
  const normalized = normalizeFinanceOverview(overview);
  const totals = normalized?.totals;

  const operations: HubLink[] = [
    {
      href: financeDeepLinkHref('agreementsAll'),
      icon: <IconClipboard size={22} />,
      labelKey: 'admin.finance.hub.linkAgreements',
      descKey: 'admin.finance.hub.linkAgreementsDesc',
      badge:
        totals?.active_agreements_count != null && totals.active_agreements_count > 0
          ? { labelKey: 'admin.finance.hub.linkAgreementsActiveBadge', count: totals.active_agreements_count }
          : null,
      show: canViewFinanceAgreements(user),
    },
    {
      href: financeDeepLinkHref('installmentsAll'),
      icon: <IconLayers size={22} />,
      labelKey: 'admin.finance.hub.linkInstallments',
      descKey: 'admin.finance.hub.linkInstallmentsDesc',
      badge:
        totals?.overdue_installments_count != null && totals.overdue_installments_count > 0
          ? {
              labelKey: 'admin.finance.hub.linkInstallmentsOverdueBadge',
              count: totals.overdue_installments_count,
            }
          : null,
      show: canViewFinanceInstallments(user),
    },
    {
      href: financeDeepLinkHref('collectionsAll'),
      icon: <IconCheckCircle size={22} />,
      labelKey: 'admin.finance.hub.linkCollections',
      descKey: 'admin.finance.hub.linkCollectionsDesc',
      show: canViewPayments(user),
    },
    {
      href: '/admin/finance/receipts',
      icon: <IconClipboard size={22} />,
      labelKey: 'admin.finance.hub.linkReceipts',
      descKey: 'admin.finance.hub.linkReceiptsDesc',
      show: canViewPayments(user),
    },
    {
      href: financeDeepLinkHref('chequesAll'),
      icon: <IconBookOpen size={22} />,
      labelKey: 'admin.finance.hub.linkCheques',
      descKey: 'admin.finance.hub.linkChequesDesc',
      badge:
        totals?.cheques_pending_count != null && totals.cheques_pending_count > 0
          ? { labelKey: 'admin.finance.hub.linkChequesPendingBadge', count: totals.cheques_pending_count }
          : null,
      show: canViewCheques(user),
    },
  ];

  const setup: HubLink[] = [
    {
      href: financeDeepLinkHref('services'),
      icon: <IconSlidersHorizontal size={22} />,
      labelKey: 'admin.finance.hub.linkServices',
      descKey: 'admin.finance.hub.linkServicesDesc',
      show: canViewFinanceServices(user),
    },
    {
      href: financeDeepLinkHref('feePlans'),
      icon: <IconLayers size={22} />,
      labelKey: 'admin.finance.hubFeePlans',
      descKey: 'admin.finance.hub.linkFeePlansDesc',
      show: canViewFinanceSetup(user),
    },
    {
      href: financeDeepLinkHref('feeTypes'),
      icon: <IconBookOpen size={22} />,
      labelKey: 'admin.finance.hubFeeTypes',
      descKey: 'admin.finance.hub.linkFeeTypesDesc',
      show: canViewFinanceSetup(user),
    },
  ];

  const visibleOperations = operations.filter((link) => link.show);
  const visibleSetup = setup.filter((link) => link.show);

  if (!visibleOperations.length && !visibleSetup.length) return null;

  return (
    <div className="finance-hub-workspaces">
      {visibleOperations.length ? (
        <section className="finance-hub-links-section">
          <h2 className="finance-hub-links-title">{t('admin.finance.hub.workspaceOperations')}</h2>
          <div className="finance-hub-grid finance-hub-grid--operations">
            {visibleOperations.map((link) => (
              <WorkspaceCard key={link.href} link={link} t={t} />
            ))}
          </div>
        </section>
      ) : null}

      {visibleSetup.length ? (
        <section className="finance-hub-links-section">
          <h2 className="finance-hub-links-title">{t('admin.finance.hub.workspaceSetup')}</h2>
          <div className="finance-hub-grid finance-hub-grid--setup">
            {visibleSetup.map((link) => (
              <WorkspaceCard key={link.href} link={link} t={t} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WorkspaceCard({
  link,
  t,
}: {
  link: HubLink;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  return (
    <Link href={link.href} className="card finance-hub-card">
      <span className="finance-hub-icon" aria-hidden>
        {link.icon}
      </span>
      <div className="finance-hub-card-body">
        <div className="finance-hub-card-title-row">
          <strong>{t(link.labelKey)}</strong>
          {link.badge ? (
            <span className="finance-hub-card-badge">
              {t(link.badge.labelKey, { count: String(link.badge.count) })}
            </span>
          ) : null}
        </div>
        <p className="muted">{t(link.descKey)}</p>
      </div>
    </Link>
  );
}
