'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { canComposeGeneralCommunication } from '@/lib/permissions/communication';
import { canViewFinance } from '@/lib/permissions/finance';
import { resolveDashboardWidgets } from '@/lib/admin/dashboard-registry';
import { todayIso } from '@/features/admin/dashboard/dashboard-interventions';
import type { CurrentUser } from '@/types/user';

type HeroAction = {
  id: string;
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
};

export function AdminDirectorCommandHero({ user }: { user: CurrentUser }) {
  const t = useT();
  const { formatDate } = useFormat();
  const widgets = resolveDashboardWidgets(user);

  const actions = useMemo<HeroAction[]>(() => {
    const quickActions = new Set(widgets.quickActions);
    const candidates: HeroAction[] = [];

    if (canComposeGeneralCommunication(user)) {
      candidates.push({
        id: 'communication',
        label: t('communication.general.newCommunication'),
        icon: '📣',
        href: '/admin/communication/compose',
      });
    }

    if (canViewFinance(user)) {
      candidates.push({
        id: 'finance',
        label: t('nav.finance'),
        icon: '💳',
        href: '/admin/finance',
      });
    }

    if (quickActions.has('attendance')) {
      candidates.push({
        id: 'attendance',
        label: t('nav.attendance'),
        icon: '🗓️',
        href: '/admin/attendance?date=today',
      });
    }

    candidates.push({
      id: 'attention',
      label: t('admin.executive.interventionTitle'),
      icon: '◎',
      onClick: () => {
        document.querySelector('.exec-decision-panel')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      },
    });

    if (quickActions.has('classes')) {
      candidates.push({
        id: 'classes',
        label: t('nav.classes'),
        icon: '🏫',
        href: '/admin/classes',
      });
    }

    if (quickActions.has('add-student')) {
      candidates.push({
        id: 'students',
        label: t('nav.students'),
        icon: '🎓',
        href: '/admin/students',
      });
    }

    return candidates.slice(0, 4);
  }, [user, widgets.quickActions, t]);

  return (
    <header className="director-command-hero">
      <div className="director-command-hero__glow" aria-hidden="true" />
      <div className="director-command-hero__intro">
        <span className="director-command-hero__date">{formatDate(todayIso())}</span>
        <h1 className="director-command-hero__welcome">
          {t('dashboard.welcome', { name: user.name })}
        </h1>
      </div>

      <nav className="director-command-hero__actions" aria-label={t('common.actions')}>
        {actions.map((action) =>
          action.href ? (
            <Link key={action.id} href={action.href} className="director-command-hero__action">
              <span className="director-command-hero__action-icon" aria-hidden="true">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </Link>
          ) : (
            <button
              key={action.id}
              type="button"
              className="director-command-hero__action"
              onClick={action.onClick}
            >
              <span className="director-command-hero__action-icon" aria-hidden="true">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
          ),
        )}
      </nav>
    </header>
  );
}
