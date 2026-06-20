'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  admissionStateTone,
  formatAdmissionReference,
  isOverdueNextAction,
  refName,
} from '../utils/admission-labels';
import type { AdmissionListItem } from '@/types/admission';

export function AdmissionCard({ item }: { item: AdmissionListItem }) {
  const t = useT();
  const overdue = isOverdueNextAction(item.next_action_date);
  const href = `/admin/admissions/${item.id}`;

  return (
    <Link
      href={href}
      className={`admission-card${overdue ? ' admission-card--overdue' : ''}`}
    >
      <div className="admission-card__title">{item.student_name}</div>
      <div className="admission-card__meta">
        {item.guardian_name && <span>{item.guardian_name}</span>}
        {item.guardian_phone && <span dir="ltr">{item.guardian_phone}</span>}
        {refName(item.requested_level) && (
          <span>{refName(item.requested_level)}</span>
        )}
        {item.next_action && (
          <span>
            {t('admin.admissions.nextAction')}: {item.next_action}
            {item.next_action_date ? ` · ${item.next_action_date}` : ''}
          </span>
        )}
        {refName(item.assigned_user) && (
          <span>{t('admin.admissions.assignedUser')}: {refName(item.assigned_user)}</span>
        )}
      </div>
      <div className="admission-card__badges">
        <Badge tone={admissionStateTone(item.state)}>
          {t(`admin.admissions.states.${item.state}`)}
        </Badge>
        {item.duplicate_count > 0 && (
          <Badge tone="amber">{t('admin.admissions.badges.possibleDuplicate')}</Badge>
        )}
        {item.offer_state === 'accepted' && (
          <Badge tone="green">{t('admin.admissions.badges.offerAccepted')}</Badge>
        )}
        {overdue && (
          <Badge tone="red">{t('admin.admissions.badges.overdue')}</Badge>
        )}
        {item.priority && (
          <Badge tone="slate">{item.priority}</Badge>
        )}
      </div>
      <span className="tiny muted">{formatAdmissionReference(item.id, item.reference)}</span>
    </Link>
  );
}
