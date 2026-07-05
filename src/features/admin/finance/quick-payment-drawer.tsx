'use client';

import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useT } from '@/features/i18n/locale-context';
import './finance-ui.css';

export type QuickPaymentDrawerMode = 'student' | 'family';
export type QuickPaymentSource = 'arrears';

export function QuickPaymentDrawer({
  open,
  onClose,
  mode,
  subtitle,
  source,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  mode: QuickPaymentDrawerMode;
  subtitle?: string;
  source?: QuickPaymentSource | null;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useT();

  if (!open) return null;

  const contextKey =
    source === 'arrears'
      ? 'admin.finance.quickPayment.arrearsContext'
      : mode === 'family'
        ? 'admin.finance.quickPayment.familyContext'
        : 'admin.finance.quickPayment.studentContext';

  const showShortIntro = source !== 'arrears';

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.quickPayment.title')}
      subtitle={subtitle}
      onClose={onClose}
      size="collection"
      className={`finance-collection-drawer finance-quick-payment-drawer${
        className ? ` ${className}` : ''
      }${mode === 'family' ? ' finance-family-collection-drawer' : ''}`}
      iconClose
    >
      <div className="finance-quick-payment-drawer__shell">
        <div className="finance-quick-payment-drawer__header-copy">
          {showShortIntro ? (
            <p className="finance-quick-payment-drawer__intro muted tiny">
              {t('admin.finance.quickPayment.intro')}
            </p>
          ) : null}
          <p className="finance-quick-payment-drawer__context muted tiny">{t(contextKey)}</p>
        </div>
        <div className="finance-quick-payment-drawer__content">{children}</div>
      </div>
    </SetupDrawer>
  );
}
