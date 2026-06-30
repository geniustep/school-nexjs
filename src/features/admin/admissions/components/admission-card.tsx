'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  cleanDisplayValue,
  formatAdmissionReference,
  isOverdueNextAction,
} from '../utils/admission-labels';
import { parseExtraFieldBool } from '../utils/admission-extra-fields';
import {
  admissionUiStageTone,
  resolveAdmissionUiStage,
} from '../utils/admission-ui-stage';
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
}: {
  item: AdmissionListItem;
  draggable?: boolean;
  showStateBadge?: boolean;
  isDragging?: boolean;
  isSaving?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const overdue = isOverdueNextAction(item.next_action_date);
  const href = `/admin/admissions/${item.id}`;
  const reference = formatAdmissionReference(item.id, item.reference);
  const studentName = cleanDisplayValue(item.student_name);
  const guardianName = cleanDisplayValue(item.guardian_name);
  const guardianPhone = cleanDisplayValue(item.guardian_phone);
  const nextAction = cleanDisplayValue(item.next_action);
  const nextActionDate = item.next_action_date ? formatDate(item.next_action_date) : '';
  const nextActionLine = [nextAction, nextActionDate].filter(Boolean).join(' — ');
  const externalReference = cleanDisplayValue(item.external_reference ?? '');
  const previousSchool = cleanDisplayValue(item.previous_school ?? '');
  const siblingsSummary = cleanDisplayValue(item.siblings_summary ?? '');
  const hasSiblings = parseExtraFieldBool(item.has_siblings);
  const uiStage = resolveAdmissionUiStage(item);
  const showOfferAcceptedBadge = item.offer_state === 'accepted' && uiStage !== 'accepted';

  const card = (
    <Link
      href={href}
      draggable={false}
      className={cn(
        'admission-card',
        overdue && 'admission-card--overdue',
        isDragging && 'admission-card--dragging',
        isSaving && 'admission-card--saving',
      )}
    >
      {draggable ? (
        <span className="admission-card__drag-handle" aria-hidden="true" title={t('admin.admissions.kanban.dragHint')}>
          ⋮⋮
        </span>
      ) : null}

      <div className="admission-card__title">
        {studentName || t('common.dash')}
      </div>

      {(externalReference || previousSchool || hasSiblings || siblingsSummary) && (
        <div className="admission-card__meta">
          {externalReference ? (
            <Badge tone="slate">{externalReference}</Badge>
          ) : null}
          {previousSchool ? (
            <span className="admission-card__previous-school tiny muted">{previousSchool}</span>
          ) : null}
          {siblingsSummary ? (
            <span className="admission-card__siblings-summary tiny muted">{siblingsSummary}</span>
          ) : null}
          {hasSiblings && !siblingsSummary ? (
            <Badge tone="blue">{t('admin.admissions.list.hasSiblingsBadge')}</Badge>
          ) : null}
        </div>
      )}

      <dl className="admission-card__details">
        {guardianName ? (
          <div className="admission-card__detail">
            <dt>{t('admin.admissions.card.guardian')}</dt>
            <dd className="admission-card__detail-value">{guardianName}</dd>
          </div>
        ) : null}
        {guardianPhone ? (
          <div className="admission-card__detail">
            <dt>{t('admin.admissions.card.phone')}</dt>
            <dd className="admission-card__detail-value" dir="ltr">
              {guardianPhone}
            </dd>
          </div>
        ) : null}
        {nextActionLine ? (
          <div className="admission-card__detail">
            <dt>{t('admin.admissions.nextAction')}</dt>
            <dd
              className={cn(
                'admission-card__detail-value',
                overdue && 'admission-card__detail--overdue',
              )}
            >
              {nextActionLine}
            </dd>
          </div>
        ) : null}
      </dl>

      {(showStateBadge || item.duplicate_count > 0 || showOfferAcceptedBadge || overdue) && (
        <div className="admission-card__status-row">
          {showStateBadge ? (
            <Badge tone={admissionUiStageTone(uiStage)}>
              {t(`admin.admissions.uiStages.${uiStage}`)}
            </Badge>
          ) : null}
          {(item.duplicate_count > 0 || showOfferAcceptedBadge || overdue) && (
            <div className="admission-card__badges">
              {item.duplicate_count > 0 && (
                <Badge tone="amber">{t('admin.admissions.badges.possibleDuplicate')}</Badge>
              )}
              {showOfferAcceptedBadge && (
                <Badge tone="green">{t('admin.admissions.badges.offerAccepted')}</Badge>
              )}
              {overdue && <Badge tone="red">{t('admin.admissions.badges.overdue')}</Badge>}
            </div>
          )}
        </div>
      )}

      <div className="admission-card__footer">
        <span className="admission-card__reference mono">{reference}</span>
      </div>
    </Link>
  );

  if (!draggable) return card;

  return (
    <div
      className={cn('admission-card-wrap', isDragging && 'admission-card-wrap--dragging')}
      draggable={!isSaving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {card}
    </div>
  );
}

export { DRAG_MIME as ADMISSION_CARD_DRAG_MIME };
