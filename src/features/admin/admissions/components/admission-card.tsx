'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import {
  cleanDisplayValue,
  formatAdmissionReference,
  isOverdueNextAction,
  refName,
} from '../utils/admission-labels';
import { resolveAdmissionPrimaryDisplay } from '../utils/admission-status-display';
import { normalizeAdmissionDecision } from '../utils/normalize-admission-decision';
import { shouldShowFamilyBadge } from '../utils/family-admission-visibility';
import { AdmissionStatusBadges } from './admission-status-badges';
import { AdmissionListActionsMenu } from './admission-list-actions-menu';
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

export function AdmissionCard({
  item,
  draggable = false,
  showStateBadge = true,
  isDragging = false,
  isSaving = false,
  onDragStart,
  onDragEnd,
  selectable = false,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onUpdated,
}: {
  item: AdmissionListItem;
  draggable?: boolean;
  showStateBadge?: boolean;
  isDragging?: boolean;
  isSaving?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
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
  const isFamily = shouldShowFamilyBadge(item);
  const decision = normalizeAdmissionDecision(item)?.decision;
  const primary = resolveAdmissionPrimaryDisplay(item);
  const stageOrDecisionLine =
    primary.kind === 'ui_stage'
      ? t(`admin.admissions.states.${String(item.state ?? 'new')}`)
      : decision
        ? t(`admin.admissions.decisions.${decision}`)
        : t(primary.labelKey);
  const dragEnabled = draggable && !selectionMode && !isSaving;

  function handleCardClick(event: React.MouseEvent) {
    if (!selectionMode || !onToggleSelect) return;
    event.preventDefault();
    event.stopPropagation();
    onToggleSelect();
  }

  function handleCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    onToggleSelect?.();
  }

  const mainContent = (
    <>
      {selectable ? (
        <label
          className="admission-card__select"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            className="admission-card__select-input"
            checked={selected}
            aria-label={t('admin.admissions.selection.selectItem', {
              name: studentName || reference,
            })}
            onChange={handleCheckboxChange}
          />
        </label>
      ) : null}

      {draggable && !selectionMode ? (
        <span
          className="admission-card__drag-handle"
          aria-hidden="true"
          title={t('admin.admissions.kanban.dragHint')}
        >
          ⋮⋮
        </span>
      ) : null}

      {selectionMode ? (
        <Link
          href={href}
          className="admission-card__open-detail"
          onClick={(event) => event.stopPropagation()}
        >
          {t('admin.admissions.selection.openDetail')}
        </Link>
      ) : null}

      <div className="admission-card__title" dir="auto">
        {studentName || t('common.dash')}
      </div>

      <div className="admission-card__meta admission-card__meta--compact">
        <span className="admission-card__reference mono tiny">{reference}</span>
        {levelName ? <span className="tiny muted">{levelName}</span> : null}
        <span className="tiny muted">
          {isFamily
            ? t('admin.admissions.workspace.requestTypeFamily')
            : t('admin.admissions.workspace.requestTypeIndividual')}
        </span>
      </div>

      <p className="admission-card__stage-line tiny muted">{stageOrDecisionLine}</p>

      {showStateBadge ? (
        <div className="admission-card__status-row">
          <AdmissionStatusBadges record={item} />
        </div>
      ) : null}
    </>
  );

  const footer = (
    <div className="admission-card__footer">
      {!selectionMode ? (
        <div
          className="admission-card__actions"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <AdmissionListActionsMenu admissionId={item.id} onUpdated={onUpdated} />
        </div>
      ) : (
        <span className="tiny muted">{overdue ? t('admin.admissions.badges.overdue') : null}</span>
      )}
    </div>
  );

  const cardClassName = cn(
    'admission-card',
    overdue && 'admission-card--overdue',
    isDragging && 'admission-card--dragging',
    isSaving && 'admission-card--saving',
    selected && 'admission-card--selected',
    selectionMode && 'admission-card--selection-mode',
  );

  if (selectionMode) {
    return (
      <div
        className={cardClassName}
        data-testid={`admission-card-${item.id}`}
        onClick={handleCardClick}
      >
        {mainContent}
        {footer}
      </div>
    );
  }

  return (
    <div
      className={cardClassName}
      data-testid={`admission-card-${item.id}`}
      draggable={dragEnabled}
      onDragStart={dragEnabled ? onDragStart : undefined}
      onDragEnd={dragEnabled ? onDragEnd : undefined}
    >
      <Link href={href} className="admission-card__link">
        {mainContent}
      </Link>
      {footer}
    </div>
  );
}
