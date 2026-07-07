'use client';

import { CopyValueButton } from '@/components/ui/copy-value-button';
import { useT } from '@/features/i18n/locale-context';
import { resolveParentAccountPresentation } from '../utils/resolve-parent-account-presentation';
import type { Parent } from '@/types/parent';

export function ParentAccountIdentityInline({ parent }: { parent: Parent }) {
  const t = useT();
  const presentation = resolveParentAccountPresentation(parent);
  if (!presentation.hasVisibleAccountInfo) return null;

  return (
    <span className="parents-family-card__account-identity">
      {presentation.code ? (
        <span className="parents-family-card__account-code">
          <span className="parents-family-card__account-code-label">
            {t('admin.guardianAccount.codeLabel')}:
          </span>
          <span className="mono" dir="ltr">
            {presentation.code}
          </span>
          <CopyValueButton
            value={presentation.code}
            label={t('admin.guardianAccount.copyCode')}
            copiedLabel={t('admin.guardianAccount.copied')}
          />
        </span>
      ) : null}
      <span className="parents-family-card__account-status">{t(presentation.statusLabelKey)}</span>
    </span>
  );
}
