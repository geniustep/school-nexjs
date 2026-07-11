/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useT } from '@/features/i18n/locale-context';
import type { GradebookAllowedActions, GradebookLifecycleAction } from '@/types/gradebook';
import {
  GRADEBOOK_LIFECYCLE_ACTIONS,
  GRADEBOOK_SENSITIVE_ACTIONS,
  gradebookLifecycleActionLabelKey,
  hasGradebookAllowedAction,
} from '../utils/gradebook-allowed-actions';
import { postAdminGradebookLifecycle } from '../api/gradebooks-api';

const ACTION_VARIANT: Partial<Record<GradebookLifecycleAction, 'primary' | 'ghost' | 'danger'>> = {
  open: 'primary',
  lock: 'danger',
  submit: 'primary',
  validate: 'primary',
  publish: 'primary',
};

export function GradebookLifecycleActions({
  gradebookId,
  allowedActions,
  onSuccess,
}: {
  gradebookId: number;
  allowedActions: GradebookAllowedActions;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [pendingAction, setPendingAction] = useState<GradebookLifecycleAction | null>(null);
  const [acting, setActing] = useState(false);

  const visibleActions = GRADEBOOK_LIFECYCLE_ACTIONS.filter((action) =>
    hasGradebookAllowedAction(allowedActions, action),
  );

  if (!visibleActions.length) return null;

  async function runAction(action: GradebookLifecycleAction) {
    setActing(true);
    const res = await postAdminGradebookLifecycle(gradebookId, action);
    setActing(false);
    if (res.success) {
      toast.success(t('admin.actionSuccess'));
      setPendingAction(null);
      onSuccess();
      return;
    }
    toast.error(res.error.message || t('admin.gradebooks.actionFailed'));
  }

  return (
    <>
      <div className="gradebook-lifecycle-actions toolbar">
        {visibleActions.map((action) => {
          const variant = ACTION_VARIANT[action] ?? 'ghost';
          const cls =
            variant === 'primary'
              ? 'btn btn--primary btn--sm'
              : variant === 'danger'
                ? 'btn btn--sm'
                : 'btn btn--ghost btn--sm';
          return (
            <button
              key={action}
              type="button"
              className={cls}
              disabled={acting}
              onClick={() => {
                if (GRADEBOOK_SENSITIVE_ACTIONS.includes(action)) {
                  setPendingAction(action);
                  return;
                }
                void runAction(action);
              }}
            >
              {t(gradebookLifecycleActionLabelKey(action))}
            </button>
          );
        })}
      </div>
      <ConfirmationDialog
        open={pendingAction != null}
        title={t('common.confirm')}
        body={
          pendingAction
            ? t(`admin.gradebooks.confirm.${pendingAction}`)
            : null
        }
        variant={pendingAction === 'lock' ? 'danger' : 'primary'}
        loading={acting}
        onConfirm={() => (pendingAction ? runAction(pendingAction) : undefined)}
        onClose={() => setPendingAction(null)}
      />
    </>
  );
}
