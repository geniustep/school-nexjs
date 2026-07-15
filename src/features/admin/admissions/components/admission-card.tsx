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
import { applicationStatusLabelKey } from '../utils/admission-modern-status';
import { resolveOperationalActionLabel } from '../utils/admission-operational-labels';
import { resolvePrimaryNextActionCode } from '../utils/admission-modern-actions';
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
  const status =
    typeof item.application_status === 'string' && item.application_status.trim()
      ? item.application_status.trim()
      : null;
  const primaryCode = resolvePrimaryNextActionCode(item.primary_next_action);
  const primaryLabel = resolveOperationalActionLabel(primaryCode, t);
  const servicesCount = item.requested_services?.length ?? 0;
  const serviceMaxVisible = servicesCount <= 3 ? 3 : 2;

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
  );

  const header = (
    <div className="admission-card__header">
      <div className="admission-card__identity">
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
          <div className="admission-card__identity-text">
            <h3 className="admission-card__title" dir="auto" title={displayName}>
              {displayName}
            </h3>
            {levelName ? (
              <p className="admission-card__level" dir="auto" title={levelName}>
                {levelName}
              </p>
            ) : null}
          </div>
        ) : (
          <Link href={href} className="admission-card__identity-link">
            <h3 className="admission-card__title" dir="auto" title={displayName}>
              {displayName}
            </h3>
            {levelName ? (
              <p className="admission-card__level" dir="auto" title={levelName}>
                {levelName}
              </p>
            ) : null}
          </Link>
        )}
      </div>
      {tools}
    </div>
  );

  const content = (
    <div className="admission-card__content">
      {selectionMode ? (
        <Link
          href={href}
          className="admission-card__open-detail"
          onClick={(event) => event.stopPropagation()}
        >
          {t('admin.admissions.selection.openDetail')}
        </Link>
      ) : null}

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
      >
        <span className="admission-card__section-label">{t('admin.admissions.nextAction')}</span>
        {primaryLabel ? (
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

  if (selectionMode) {
    return (
      <div
        className={cardClassName}
        data-testid={`admission-card-${item.id}`}
        onClick={handleCardClick}
      >
        {header}
        {content}
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
      {header}
      <Link href={href} className="admission-card__link">
        {content}
      </Link>
    </div>
  );
}
