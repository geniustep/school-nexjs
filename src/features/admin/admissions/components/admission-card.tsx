'use client';

import { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { PhoneText } from '@/components/ui/numeric-text';
import { useT } from '@/features/i18n/locale-context';
import {
  cleanDisplayValue,
  formatAdmissionReference,
  isOverdueNextAction,
  refName,
} from '../utils/admission-labels';
import { applicationStatusLabelKey } from '../utils/admission-modern-status';
import { resolveOperationalActionLabel } from '../utils/admission-operational-labels';
import { resolvePrimaryNextActionCode } from '../utils/admission-modern-actions';
import { resolveAdmissionTerminalReasonPanel } from '../utils/admission-terminal-reason';
import { AdmissionListActionsMenu } from './admission-list-actions-menu';
import { AdmissionLastActionSummary } from './admission-last-action-summary';
import { AdmissionRequestedServicesChips } from './admission-requested-services-chips';
import { AdmissionStatusBadges } from './admission-status-badges';
import type { AdmissionListItem } from '@/types/admission';

const DRAG_MIME = 'application/x-admission-id';

export function admissionCardDragPayload(admissionId: number): string {
  return String(admissionId);
}

export function readAdmissionCardDragPayload(dataTransfer: DataTransfer): number | null {
  const raw = dataTransfer.getData(DRAG_MIME) || dataTransfer.getData('text/plain');
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Checkbox / menu / links must not initiate Kanban drag. */
export function isAdmissionCardDragBlockedTarget(target: EventTarget | null): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null;
  if (!el || typeof el.closest !== 'function') return false;
  if (el.closest('.admission-card__drag-handle')) return false;
  return Boolean(
    el.closest(
      'a, input, textarea, select, label, button, .admission-card__select, .admission-card__actions',
    ),
  );
}

function AdmissionCardComponent({
  item,
  draggable = false,
  showStateBadge = true,
  hideUiStagePrimary = false,
  processingStageHintKey = null,
  isDragging = false,
  isSaving = false,
  onDragPointerDown,
  selectable = false,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onUpdated,
}: {
  item: AdmissionListItem;
  draggable?: boolean;
  showStateBadge?: boolean;
  /** Hide primary badge when it only restates the Kanban column stage. */
  hideUiStagePrimary?: boolean;
  /** Small sub-stage label (e.g. assessment_ready inside the Assessment column). */
  processingStageHintKey?: string | null;
  isDragging?: boolean;
  isSaving?: boolean;
  /** Pointer-based Kanban drag (preferred over HTML5 DnD). */
  onDragPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  selectable?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  onUpdated?: () => void;
}) {
  const t = useT();
  const overdue = isOverdueNextAction(item.next_action_date);
  const href = `/admin/admissions/${item.id}`;
  const reference = formatAdmissionReference(item.id, item.reference);
  const studentName = cleanDisplayValue(item.student_name);
  const levelName = refName(item.requested_level);
  const guardianName = cleanDisplayValue(item.guardian_name);
  const guardianPhone = cleanDisplayValue(item.guardian_phone);
  const dragEnabled = draggable && !isSaving;
  const displayName = studentName || t('common.dash');
  const status =
    typeof item.application_status === 'string' && item.application_status.trim()
      ? item.application_status.trim()
      : null;
  const terminalReason = resolveAdmissionTerminalReasonPanel(item);
  const primaryCode = terminalReason
    ? null
    : resolvePrimaryNextActionCode(item.primary_next_action);
  const primaryLabel = terminalReason
    ? terminalReason.reason
    : resolveOperationalActionLabel(primaryCode, t);
  const servicesCount = item.requested_services?.length ?? 0;
  const serviceMaxVisible = servicesCount <= 3 ? 3 : 2;

  function handleCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    onToggleSelect?.();
  }

  function handleDragPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!dragEnabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture may fail if the element is not active yet.
    }
    onDragPointerDown?.(event);
  }

  const tools = (
    <div className="admission-card__tools">
      {selectable ? (
        <label
          className={cn(
            'admission-card__select',
            selected && 'admission-card__select--checked',
            selectionMode && 'admission-card__select--forced',
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            className="admission-card__select-input"
            checked={selected}
            aria-label={t(
              selected
                ? 'admin.admissions.selection.deselectItem'
                : 'admin.admissions.selection.selectItem',
              { name: displayName },
            )}
            onChange={handleCheckboxChange}
          />
        </label>
      ) : null}
      <div
        className="admission-card__actions"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <AdmissionListActionsMenu
          admissionId={item.id}
          listItem={item}
          onUpdated={onUpdated}
          compact
        />
      </div>
    </div>
  );

  const header = (
    <div className="admission-card__header">
      <div className="admission-card__identity">
        {dragEnabled ? (
          <button
            type="button"
            className="admission-card__drag-handle"
            aria-label={t('admin.admissions.kanban.dragHint')}
            title={t('admin.admissions.kanban.dragHint')}
            data-testid={`admission-card-drag-handle-${item.id}`}
            data-admission-id={item.id}
            onPointerDown={handleDragPointerDown}
            onClick={(event) => event.preventDefault()}
          >
            <span aria-hidden="true">⋮⋮</span>
          </button>
        ) : null}
        <Link href={href} className="admission-card__identity-link" draggable={false}>
          <h3 className="admission-card__title" dir="auto" title={displayName}>
            {displayName}
          </h3>
          {levelName ? (
            <p className="admission-card__level" dir="auto" title={levelName}>
              {levelName}
            </p>
          ) : null}
        </Link>
      </div>
      {tools}
    </div>
  );

  const content = (
    <div className="admission-card__content">
      {(item.requested_services?.length ?? 0) > 0 ? (
        <div className="admission-card__requested-services">
          <AdmissionRequestedServicesChips
            services={item.requested_services}
            maxVisible={serviceMaxVisible}
            compact
          />
        </div>
      ) : null}

      {processingStageHintKey ? (
        <p
          className="admission-card__substage muted tiny"
          data-testid="admission-card-processing-stage-hint"
          dir="auto"
        >
          {t(processingStageHintKey)}
        </p>
      ) : null}

      <div className="admission-card__guardian" data-testid="admission-card-guardian">
        <span className="admission-card__section-label">{t('admin.admissions.card.guardian')}</span>
        {guardianName || guardianPhone ? (
          <div className="admission-card__guardian-rows">
            {guardianName ? (
              <p className="admission-card__guardian-name" dir="auto" title={guardianName}>
                {guardianName}
              </p>
            ) : (
              <p className="admission-card__guardian-name muted">
                {t('admin.admissions.card.guardianEmpty')}
              </p>
            )}
            {guardianPhone ? (
              <p className="admission-card__phone">
                <span className="admission-card__section-label admission-card__section-label--inline">
                  {t('admin.admissions.card.phone')}
                </span>{' '}
                <PhoneText>{guardianPhone}</PhoneText>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="muted tiny">{t('admin.admissions.card.guardianEmpty')}</p>
        )}
      </div>

      {showStateBadge ? (
        <div className="admission-card__status-row">
          <AdmissionStatusBadges
            record={item}
            hideUiStagePrimary={hideUiStagePrimary}
          />
          {overdue && selectionMode ? (
            <span className="admission-card__overdue-tag">
              {t('admin.admissions.badges.overdue')}
            </span>
          ) : null}
        </div>
      ) : status ? (
        <span className="admission-card__sr-ref" data-testid="admission-card-status-sr">
          {t(applicationStatusLabelKey(status))}
        </span>
      ) : null}

      <div className="admission-card__last-action" data-testid="admission-card-last-action">
        <AdmissionLastActionSummary action={item.last_action} layout="card" />
      </div>

      <div
        className="admission-card__primary-next"
        data-testid="admission-card-primary-next"
        data-reason-kind={terminalReason?.kind}
      >
        <span className="admission-card__section-label">
          {terminalReason
            ? t(terminalReason.titleKey)
            : t('admin.admissions.nextAction')}
        </span>
        {terminalReason ? (
          <p
            className={
              terminalReason.reason
                ? 'admission-card__primary-next-value'
                : 'admission-card__primary-next-value muted'
            }
            dir="auto"
            data-testid="admission-card-terminal-reason"
          >
            {terminalReason.reason || t(terminalReason.emptyKey)}
          </p>
        ) : primaryLabel ? (
          <p
            className="admission-card__primary-next-value"
            dir="auto"
            data-action-code={primaryCode ?? undefined}
          >
            {primaryLabel}
          </p>
        ) : (
          <p className="admission-card__primary-next-value muted">
            {t('admin.admissions.card.noNextAction')}
          </p>
        )}
      </div>

      <span className="admission-card__sr-ref">{reference}</span>
    </div>
  );

  const cardClassName = cn(
    'admission-card',
    'admission-card--operational',
    overdue && 'admission-card--overdue',
    isDragging && 'admission-card--dragging',
    isSaving && 'admission-card--saving',
    selected && 'admission-card--selected',
    selectionMode && 'admission-card--selection-mode',
  );

  return (
    <div
      className={cardClassName}
      data-testid={`admission-card-${item.id}`}
      data-draggable={dragEnabled ? 'true' : 'false'}
    >
      {header}
      <Link href={href} className="admission-card__link" draggable={false}>
        {content}
      </Link>
    </div>
  );
}

/** Memoized for Kanban: pointer-move no longer re-renders every card. */
export const AdmissionCard = memo(AdmissionCardComponent);
