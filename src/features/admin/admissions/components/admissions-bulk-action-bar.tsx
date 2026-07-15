'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { intersectAllowedStatusTargets } from '../utils/admission-modern-actions';
import type { AdmissionListItem } from '@/types/admission';
import { AdmissionChangeStatusDialog } from './admission-change-status-dialog';

export function AdmissionsBulkActionBar({
  selectedItems,
  onClearSelection,
  onUpdated,
  onSelectVisible,
  visibleCount,
  className,
}: {
  selectedItems: AdmissionListItem[];
  onClearSelection: () => void;
  onUpdated?: () => void;
  /** Select all items currently visible on the page (not full server result set). */
  onSelectVisible?: () => void;
  visibleCount?: number;
  className?: string;
}) {
  const t = useT();
  const [dialogOpen, setDialogOpen] = useState(false);

  const sharedTargets = useMemo(
    () => intersectAllowedStatusTargets(selectedItems),
    [selectedItems],
  );
  const canBulkChange = selectedItems.length > 0 && sharedTargets.length > 0;

  return (
    <div
      className={cn('admissions-bulk-bar', className)}
      role="region"
      aria-live="polite"
      data-testid="admissions-bulk-action-bar"
    >
      <div className="admissions-bulk-bar__summary">
        <span className="admissions-bulk-bar__count" data-testid="admissions-bulk-selected-count">
          {t('admin.admissions.bulk.selectedCount', { count: selectedItems.length })}
        </span>
        {visibleCount != null ? (
          <span className="tiny muted" data-testid="admissions-bulk-page-scope-hint">
            {t('admin.admissions.bulk.pageScopeHint', { count: visibleCount })}
          </span>
        ) : null}
        {!canBulkChange && selectedItems.length > 0 ? (
          <span className="tiny muted" data-testid="admissions-bulk-no-shared-targets">
            {t('admin.admissions.bulk.noSharedTargets')}
          </span>
        ) : null}
      </div>

      <div className="admissions-bulk-bar__actions">
        {onSelectVisible ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid="admissions-bulk-select-visible"
            onClick={onSelectVisible}
          >
            {t('admin.admissions.bulk.selectVisible')}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!canBulkChange}
          data-testid="admissions-bulk-change-status"
          onClick={() => setDialogOpen(true)}
        >
          {t('admin.admissions.bulk.changeStatus')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm admissions-bulk-bar__clear"
          data-testid="admissions-bulk-clear"
          onClick={onClearSelection}
        >
          {t('admin.admissions.bulk.clearSelection')}
        </button>
      </div>

      <AdmissionChangeStatusDialog
        admissionIds={selectedItems.map((item) => item.id)}
        allowedStatusTargets={sharedTargets}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onBulkSuccess={() => {
          onClearSelection();
          onUpdated?.();
        }}
        onBulkFailure={() => {
          /* keep selection */
        }}
      />
    </div>
  );
}
