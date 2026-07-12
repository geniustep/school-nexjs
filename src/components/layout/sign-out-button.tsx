'use client';

import { useT } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';

export function SignOutButton({
  loggingOut,
  onClick,
  className,
  size = 'default',
  block = false,
  title,
}: {
  loggingOut: boolean;
  onClick: () => void;
  className?: string;
  size?: 'default' | 'sm';
  block?: boolean;
  title?: string;
}) {
  const t = useT();

  return (
    <button
      type="button"
      className={cn(
        'btn btn--ghost sign-out-btn',
        size === 'sm' && 'btn--sm',
        block && 'btn--block',
        loggingOut && 'sign-out-btn--busy',
        className,
      )}
      onClick={onClick}
      disabled={loggingOut}
      aria-busy={loggingOut}
      aria-live="polite"
      title={title}
    >
      <span className="sign-out-btn__inner">
        {loggingOut ? (
          <>
            <span className="sign-out-btn__spinner" aria-hidden="true" />
            <span>{t('common.signingOut')}</span>
          </>
        ) : (
          t('common.signOut')
        )}
      </span>
    </button>
  );
}
