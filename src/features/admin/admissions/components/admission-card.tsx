'use client';

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
import { AdmissionStatusBadges } from './admission-status-badges';
import { AdmissionListActionsMenu } from './admission-list-actions-menu';
import { AdmissionLastActionSummary } from './admission-last-action-summary';
import { AdmissionRequestedServicesChips } from './admission-requested-services-chips';
import { resolvePrimaryNextActionCode } from '../utils/admission-modern-actions';
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
  hideUiStagePrimary = false,
  processingStageHintKey = null,
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
  /** Hide primary badge when it only restates the Kanban column stage. */
  hideUiStagePrimary?: boolean;
  /** Small sub-stage label (e.g. assessment_ready inside the Assessment column). */
  processingStageHintKey?: string | null;
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
  const guardianName = cleanDisplayValue(item.guardian_name);
  const guardianPhone = cleanDisplayValue(item.guardian_phone);
  const dragEnabled = draggable && !selectionMode && !isSaving;
  const displayName = studentName || t('common.dash');

  function isInteractiveDragSource(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'input, button, a, label, .admission-card__select, .admission-card__actions, .admission-card__open-detail',
      ),
    );
  }

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

  function handleDragStart(event: React.DragEvent<HTMLDivElement>) {
    if (!dragEnabled || isInteractiveDragSource(event.target)) {
      event.preventDefault();
      return;
    }
    onDragStart?.(event);
  }

  const toolbar = (
    <div className="admission-card__toolbar">
      <div className="admission-card__toolbar-start">
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
      </div>
      <div className="admission-card__toolbar-end">
        {selectable ? (
          <label
            className="admission-card__select"
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
        {!selectionMode ? (
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
        ) : null}
      </div>
    </div>
  );

  const body = (
    <div className="admission-card__body">
      <h3 className="admission-card__title" dir="auto">
        {displayName}
      </h3>

      {levelName ? (
        <p className="admission-card__level" dir="auto">
          {levelName}
        </p>
      ) : null}

      {(item.requested_services?.length ?? 0) > 0 ? (
        <div className="admission-card__requested-services">
          <AdmissionRequestedServicesChips
            services={item.requested_services}
            maxVisible={2}
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

      {guardianName || guardianPhone ? (
        <dl className="admission-card__details">
          {guardianName ? (
            <div className="admission-card__detail">
              <dt>{t('admin.admissions.card.guardian')}</dt>
              <dd>
                <span className="admission-card__detail-value" dir="auto">
                  {guardianName}
                </span>
              </dd>
            </div>
          ) : null}
          {guardianPhone ? (
            <div className="admission-card__detail">
              <dt>{t('admin.admissions.card.phone')}</dt>
              <dd>
                <span className="admission-card__detail-value admission-card__phone">
                  <PhoneText>{guardianPhone}</PhoneText>
                </span>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="admission-card__status-row">
        {showStateBadge ? (
          <AdmissionStatusBadges
            record={item}
            hideUiStagePrimary={hideUiStagePrimary}
          />
        ) : null}
        {overdue && selectionMode ? (
          <span className="admission-card__overdue-tag">
            {t('admin.admissions.badges.overdue')}
          </span>
        ) : null}
      </div>

      <div className="admission-card__last-action" data-testid="admission-card-last-action">
        <AdmissionLastActionSummary action={item.last_action} />
      </div>

      {resolvePrimaryNextActionCode(item.primary_next_action) ? (
        <p className="admission-card__primary-next muted tiny" data-testid="admission-card-primary-next">
          {t('admin.admissions.nextAction')}: {resolvePrimaryNextActionCode(item.primary_next_action)}
        </p>
      ) : null}

      {/* Visually hidden reference for a11y / tests — not shown as #id clutter */}
      <span className="admission-card__sr-ref">{reference}</span>
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
        {toolbar}
        {body}
      </div>
    );
  }

  return (
    <div
      className={cardClassName}
      data-testid={`admission-card-${item.id}`}
      draggable={dragEnabled}
      onDragStart={dragEnabled ? handleDragStart : undefined}
      onDragEnd={dragEnabled ? onDragEnd : undefined}
    >
      {toolbar}
      <Link href={href} className="admission-card__link">
        {body}
      </Link>
    </div>
  );
}
