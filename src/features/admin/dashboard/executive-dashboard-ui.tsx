'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Badge, type Tone } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useLocale } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';
import { formatExecutiveKpiMoneyParts } from '@/features/admin/dashboard/executive-kpi-utils';

export type ExecutiveTone = 'blue' | 'green' | 'amber' | 'red' | 'neutral' | 'indigo';

export type ExecutiveInterventionItemData = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  icon?: string;
  tone?: 'amber' | 'default';
};

type AttentionCopy = {
  title: string;
  viewAll: string;
  drawerTitle: string;
  close: string;
  open: string;
  arrow: string;
};

const TONE_LABEL: Record<ExecutiveTone, string> = {
  blue: 'exec-kpi--blue',
  green: 'exec-kpi--green',
  amber: 'exec-kpi--amber',
  red: 'exec-kpi--red',
  neutral: 'exec-kpi--neutral',
  indigo: 'exec-kpi--indigo',
};

const ATTENTION_COPY: Record<Locale, AttentionCopy> = {
  ar: {
    title: 'أولويات اليوم',
    viewAll: 'عرض الكل',
    drawerTitle: 'كل الأولويات',
    close: 'إغلاق',
    open: 'فتح',
    arrow: '←',
  },
  fr: {
    title: "À surveiller aujourd’hui",
    viewAll: 'Tout afficher',
    drawerTitle: 'Toutes les priorités',
    close: 'Fermer',
    open: 'Ouvrir',
    arrow: '→',
  },
  en: {
    title: 'Needs your attention today',
    viewAll: 'View all',
    drawerTitle: 'All priorities',
    close: 'Close',
    open: 'Open',
    arrow: '→',
  },
  es: {
    title: 'Requiere tu atención hoy',
    viewAll: 'Ver todo',
    drawerTitle: 'Todas las prioridades',
    close: 'Cerrar',
    open: 'Abrir',
    arrow: '→',
  },
};

const ATTENDANCE_TODAY_HREF = '/admin/attendance?date=today';

export function shouldRenderExecutiveKpiCard(href: string | undefined, value: ReactNode): boolean {
  // Attendance is an optional daily pulse. A placeholder means coverage is
  // incomplete or unavailable, so keep the executive strip quiet instead of
  // promoting an untrustworthy percentage.
  return !(href === ATTENDANCE_TODAY_HREF && value === '—');
}

export function normalizeExecutiveInterventionLabel(label: string, locale: Locale): string {
  if (locale !== 'ar') return label;

  return label
    .replace('حسابًا تحتاج اتصال تحصيل', 'حسابًا بحاجة إلى متابعة التحصيل')
    .replace('حسابات تحتاج اتصال تحصيل', 'حسابات بحاجة إلى متابعة التحصيل')
    .replace('حسابان يحتاجان اتصال تحصيل', 'حسابان بحاجة إلى متابعة التحصيل')
    .replace('حساب واحد يحتاج اتصال تحصيل', 'حساب واحد بحاجة إلى متابعة التحصيل')
    .replace('طلبات تحتاج متابعة', 'طلبات تسجيل بحاجة إلى متابعة')
    .replace('طلبان يحتاجان متابعة', 'طلبا تسجيل بحاجة إلى متابعة')
    .replace('طلب واحد يحتاج متابعة', 'طلب تسجيل واحد بحاجة إلى متابعة')
    .replace('تلميذًا بدون ولي مرتبط', 'تلميذًا دون ولي أمر مرتبط')
    .replace('تلاميذ بدون ولي مرتبط', 'تلاميذ دون ولي أمر مرتبط');
}

export function ExecutiveKpiMoney({
  amount,
  currency,
}: {
  amount?: number | null;
  currency?: unknown;
}) {
  const { locale } = useLocale();
  const parts = formatExecutiveKpiMoneyParts(amount, currency, locale);
  if (!parts) return <>—</>;

  return (
    <span className="exec-kpi__money finance-amount" dir="ltr">
      <span className="exec-kpi__money-amount">{parts.amount}</span>
      <span className="exec-kpi__money-currency">{parts.currency}</span>
    </span>
  );
}

export function ExecutiveKpiCard({
  label,
  value,
  hint,
  badge,
  badgeTone = 'slate',
  tone = 'neutral',
  href,
  empty,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  badge?: string;
  badgeTone?: Tone;
  tone?: ExecutiveTone;
  href?: string;
  empty?: boolean;
}) {
  if (!shouldRenderExecutiveKpiCard(href, value)) return null;

  const className = cn(
    'exec-kpi',
    TONE_LABEL[tone],
    href && 'exec-kpi--link',
    empty && 'exec-kpi--empty',
  );

  const inner = (
    <>
      <div className="exec-kpi__top">
        <span className="exec-kpi__label">{label}</span>
        {badge ? <Badge tone={badgeTone}>{badge}</Badge> : null}
      </div>
      <div className="exec-kpi__value">{value}</div>
      {hint ? <p className="exec-kpi__hint">{hint}</p> : null}
      {href ? <span className="exec-kpi__cta" aria-hidden="true" /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function ExecutivePanel({
  title,
  description,
  icon,
  footer,
  variant = 'default',
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: string;
  footer?: ReactNode;
  variant?: 'default' | 'accent' | 'attention';
  children: ReactNode;
  className?: string;
}) {
  const { locale } = useLocale();
  const isAttentionPanel = className?.split(/\s+/).includes('exec-decision-panel') ?? false;
  const resolvedTitle = isAttentionPanel ? ATTENTION_COPY[locale].title : title;
  const resolvedDescription = isAttentionPanel ? undefined : description;
  const resolvedFooter = isAttentionPanel ? undefined : footer;

  return (
    <article
      className={cn(
        'exec-panel',
        variant === 'accent' && 'exec-panel--accent',
        variant === 'attention' && 'exec-panel--attention',
        className,
      )}
    >
      <header className="exec-panel__head">
        <div className="exec-panel__title-row">
          {icon ? (
            <span className="exec-panel__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h3 className="exec-panel__title">{resolvedTitle}</h3>
        </div>
        {resolvedDescription ? <p className="exec-panel__desc">{resolvedDescription}</p> : null}
      </header>
      <div className="exec-panel__body">{children}</div>
      {resolvedFooter ? <footer className="exec-panel__foot">{resolvedFooter}</footer> : null}
    </article>
  );
}

export function ExecutiveZoneLabel({ children }: { children: ReactNode }) {
  return <h2 className="exec-zone-label">{children}</h2>;
}

export function ExecutiveEmpty({
  icon = '◌',
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="exec-empty">
      <span className="exec-empty__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="exec-empty__title">{title}</p>
      {description ? <p className="exec-empty__desc">{description}</p> : null}
    </div>
  );
}

export function ExecutiveInterventionItem({
  item,
}: {
  item: ExecutiveInterventionItemData;
}) {
  const { locale } = useLocale();
  const copy = ATTENTION_COPY[locale];
  const severity = item.tone === 'amber' ? 'high' : 'normal';
  const label = normalizeExecutiveInterventionLabel(item.label, locale);
  const linkedAction = item.href ? item.hint || copy.open : null;

  const inner = (
    <>
      <span className={cn('exec-decision__severity', `exec-decision__severity--${severity}`)} />
      {item.icon ? (
        <span className="exec-decision__icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className="exec-decision__copy">
        <span className="exec-decision__label">{label}</span>
        {!item.href && item.hint ? <span className="exec-decision__hint">{item.hint}</span> : null}
      </span>
      {linkedAction ? (
        <span className="exec-decision__action" aria-hidden="true">
          {linkedAction} <span>{copy.arrow}</span>
        </span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link href={item.href} className="exec-decision exec-decision--link">
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="exec-decision">{inner}</div>
    </li>
  );
}

export function ExecutiveDecisionList({
  items,
  emptyTitle,
  emptyDescription,
  visibleLimit = 3,
}: {
  items: ExecutiveInterventionItemData[];
  emptyTitle: string;
  emptyDescription?: string;
  visibleLimit?: number;
}) {
  const { locale } = useLocale();
  const copy = ATTENTION_COPY[locale];
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The main intervention list is the call-site that supplies a real empty-state
  // title. The data-quality sub-list intentionally passes an empty title and
  // therefore remains a plain list without summary truncation or a drawer.
  const summaryMode = emptyTitle.trim().length > 0;
  const visibleItems = summaryMode ? items.slice(0, visibleLimit) : items;
  const canOpenDrawer = summaryMode && items.length > visibleLimit;

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  if (!items.length) {
    return <ExecutiveEmpty icon="✓" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('exec-decision-list-wrap', summaryMode && 'exec-decision-list-wrap--summary')}>
      {canOpenDrawer ? (
        <button
          type="button"
          className="exec-decision-list__view-all"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          {copy.viewAll} ({items.length})
        </button>
      ) : null}

      <ul className={cn('exec-decision-list', summaryMode && 'exec-decision-list--summary')}>
        {visibleItems.map((item) => (
          <ExecutiveInterventionItem key={item.id} item={item} />
        ))}
      </ul>

      {canOpenDrawer && drawerOpen ? (
        <>
          <div
            className="exec-attention-drawer__backdrop"
            role="presentation"
            onMouseDown={() => setDrawerOpen(false)}
          />
          <aside
            className="exec-attention-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={copy.drawerTitle}
          >
            <header className="exec-attention-drawer__head">
              <div>
                <h2>{copy.drawerTitle}</h2>
                <span className="exec-attention-drawer__count">{items.length}</span>
              </div>
              <button
                type="button"
                className="exec-attention-drawer__close"
                aria-label={copy.close}
                onClick={() => setDrawerOpen(false)}
                autoFocus
              >
                ×
              </button>
            </header>
            <div className="exec-attention-drawer__body">
              <ul className="exec-decision-list exec-decision-list--drawer">
                {items.map((item) => (
                  <ExecutiveInterventionItem key={item.id} item={item} />
                ))}
              </ul>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

export function ExecutiveMetricTile({
  label,
  value,
  warn,
}: {
  label: string;
  value: ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={cn('exec-metric-tile', warn && 'exec-metric-tile--warn')}>
      <span className="exec-metric-tile__label">{label}</span>
      <strong className="exec-metric-tile__value exec-metric-tile__value--numeric">{value}</strong>
    </div>
  );
}

export function ExecutiveLinkRow({ children }: { children: ReactNode }) {
  return <div className="exec-link-row">{children}</div>;
}

export function ExecutiveAdmissionStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: ExecutiveTone;
}) {
  const admTone: Record<ExecutiveTone, string> = {
    blue: 'exec-adm-stat--blue',
    green: 'exec-adm-stat--green',
    amber: 'exec-adm-stat--amber',
    red: 'exec-adm-stat--red',
    neutral: 'exec-adm-stat--neutral',
    indigo: 'exec-adm-stat--indigo',
  };

  return (
    <div className={cn('exec-adm-stat', admTone[tone])}>
      <span className="exec-adm-stat__value">{value}</span>
      <span className="exec-adm-stat__label">{label}</span>
    </div>
  );
}
