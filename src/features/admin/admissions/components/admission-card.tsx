'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  admissionStateTone,
  formatAdmissionReference,
  isOverdueNextAction,
} from '../utils/admission-labels';
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
  isDragging = false,
  isSaving = false,
  onDragStart,
  onDragEnd,
}: {
  item: AdmissionListItem;
  draggable?: boolean;
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
  const nextActionDate = item.next_action_date ? formatDate(item.next_action_date) : '';

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

      <div className="admission-card__head">
        <div className="admission-card__title">{item.student_name}</div>
        <Badge tone={admissionStateTone(item.state)}>
          {t(`admin.admissions.states.${item.state}`)}
        </Badge>
      </div>

      <dl className="admission-card__details">
        {item.guardian_name ? (
          <div className="admission-card__detail">
            <dt>{t('admin.admissions.card.guardian')}</dt>
            <dd>{item.guardian_name}</dd>
          </div>
        ) : null}
        {item.guardian_phone ? (
          <div className="admission-card__detail">
            <dt>{t('admin.admissions.card.phone')}</dt>
            <dd dir="ltr">{item.guardian_phone}</dd>
          </div>
        ) : null}
        {item.next_action || nextActionDate ? (
          <div className="admission-card__detail">
            <dt>{t('admin.admissions.nextAction')}</dt>
            <dd className={overdue ? 'admission-card__detail--overdue' : undefined}>
              {[item.next_action, nextActionDate].filter(Boolean).join(' — ')}
            </dd>
          </div>
        ) : null}
      </dl>

      {(item.duplicate_count > 0 || item.offer_state === 'accepted' || overdue) && (
        <div className="admission-card__badges">
          {item.duplicate_count > 0 && (
            <Badge tone="amber">{t('admin.admissions.badges.possibleDuplicate')}</Badge>
          )}
          {item.offer_state === 'accepted' && (
            <Badge tone="green">{t('admin.admissions.badges.offerAccepted')}</Badge>
          )}
          {overdue && <Badge tone="red">{t('admin.admissions.badges.overdue')}</Badge>}
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
