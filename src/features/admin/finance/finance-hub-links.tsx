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
import type { AdminFinanceOverview } from '@/types/finance';

type HubLink = {
  href: string;
  icon: ReactNode;
  labelKey: string;
  descKey: string;
  hint?: string | null;
  show: boolean;
};

export function FinanceHubLinks({ overview }: { overview: AdminFinanceOverview | null }) {
  const user = useSession();
  const t = useT();
  const normalized = normalizeFinanceOverview(overview);
  const totals = normalized?.totals;

  const operations: HubLink[] = [
    {
      href: '/admin/finance/agreements',
      icon: <IconClipboard size={22} />,
      labelKey: 'admin.finance.hub.linkAgreements',
      descKey: 'admin.finance.hub.linkAgreementsDesc',
      hint: totals?.active_agreements_count != null ? String(totals.active_agreements_count) : null,
      show: canViewFinanceAgreements(user),
    },
    {
      href: '/admin/finance/installments',
      icon: <IconLayers size={22} />,
      labelKey: 'admin.finance.hub.linkInstallments',
      descKey: 'admin.finance.hub.linkInstallmentsDesc',
      hint:
        totals?.overdue_installments_count != null
          ? String(totals.overdue_installments_count)
          : null,
      show: canViewFinanceInstallments(user),
    },
    {
      href: '/admin/finance/collections',
      icon: <IconCheckCircle size={22} />,
      labelKey: 'admin.finance.hub.linkCollections',
      descKey: 'admin.finance.hub.linkCollectionsDesc',
      show: canViewPayments(user),
    },
    {
      href: '/admin/finance/cheques',
      icon: <IconBookOpen size={22} />,
      labelKey: 'admin.finance.hub.linkCheques',
      descKey: 'admin.finance.hub.linkChequesDesc',
      hint: totals?.cheques_pending_count != null ? String(totals.cheques_pending_count) : null,
      show: canViewCheques(user),
    },
  ];

  const setup: HubLink[] = [
    {
      href: '/admin/finance/services',
      icon: <IconSlidersHorizontal size={22} />,
      labelKey: 'admin.finance.hub.linkServices',
      descKey: 'admin.finance.hub.linkServicesDesc',
      show: canViewFinanceServices(user),
    },
    {
      href: '/admin/finance/fee-plans',
      icon: <IconLayers size={22} />,
      labelKey: 'admin.finance.hubFeePlans',
      descKey: 'admin.finance.hub.linkFeePlansDesc',
      show: canViewFinanceSetup(user),
    },
    {
      href: '/admin/finance/fee-types',
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
  t: (key: string) => string;
}) {
  return (
    <Link href={link.href} className="card finance-hub-card">
      <span className="finance-hub-icon" aria-hidden>
        {link.icon}
      </span>
      <div className="finance-hub-card-body">
        <strong>{t(link.labelKey)}</strong>
        <p className="muted">{t(link.descKey)}</p>
      </div>
      {link.hint ? <span className="finance-hub-card-hint mono">{link.hint}</span> : null}
    </Link>
  );
}
