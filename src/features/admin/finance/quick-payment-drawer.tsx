'use client';

import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useT } from '@/features/i18n/locale-context';
import './finance-ui.css';
import './quick-payment-simplified.css';

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
        : null;
  const isFamily = mode === 'family';

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.quickPayment.title')}
      subtitle={subtitle}
      onClose={onClose}
      size="collection"
      className={`finance-collection-drawer finance-quick-payment-drawer${
        className ? ` ${className}` : ''
      }${isFamily ? ' finance-family-collection-drawer' : ''}`}
      iconClose
    >
      <div className="finance-quick-payment-drawer__shell">
        {contextKey ? (
          <div className="finance-quick-payment-drawer__header-copy">
            <p className="finance-quick-payment-drawer__context">{t(contextKey)}</p>
          </div>
        ) : null}
        <div className="finance-quick-payment-drawer__content">{children}</div>
      </div>
    </SetupDrawer>
  );
}
