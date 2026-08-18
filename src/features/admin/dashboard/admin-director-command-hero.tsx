'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { canComposeGeneralCommunication } from '@/lib/permissions/communication';
import {
  canCollectPayments,
  canViewFinance,
  canViewPayments,
} from '@/lib/permissions/finance';
import { todayIso } from '@/features/admin/dashboard/dashboard-interventions';
import type { CurrentUser } from '@/types/user';

type HeroAction = {
  id: string;
  label: string;
  icon: string;
  href: string;
};

export function AdminDirectorCommandHero({ user }: { user: CurrentUser }) {
  const t = useT();
  const { formatDate } = useFormat();

  const actions = useMemo<HeroAction[]>(() => {
    const candidates: HeroAction[] = [];

    if (canComposeGeneralCommunication(user)) {
      candidates.push({
        id: 'communication',
        label: t('communication.general.newCommunication'),
        icon: '📣',
        href: '/admin/communication/compose',
      });
    }

    if (canCollectPayments(user) && canViewPayments(user)) {
      candidates.push({
        id: 'payment',
        label: t('admin.finance.recordCollection'),
        icon: '💳',
        href: '/admin/finance/collections/new',
      });
    } else if (canViewFinance(user)) {
      candidates.push({
        id: 'finance',
        label: t('nav.finance'),
        icon: '💳',
        href: '/admin/finance',
      });
    }

    return candidates;
  }, [user, t]);

  const userName = user.name?.trim() ?? '';
  const hasTechnicalAdminName = !userName || /^(administrator|admin)$/i.test(userName);
  const heading = hasTechnicalAdminName
    ? t('nav.dashboard')
    : t('dashboard.welcome', { name: userName });

  return (
    <header className="director-command-hero">
      <div className="director-command-hero__glow" aria-hidden="true" />
      <div className="director-command-hero__intro">
        <span className="director-command-hero__date">{formatDate(todayIso())}</span>
        <h1 className="director-command-hero__welcome">{heading}</h1>
      </div>

      {actions.length > 0 ? (
        <nav className="director-command-hero__actions" aria-label={t('common.actions')}>
          {actions.map((action) => (
            <Link key={action.id} href={action.href} className="director-command-hero__action">
              <span className="director-command-hero__action-icon" aria-hidden="true">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
