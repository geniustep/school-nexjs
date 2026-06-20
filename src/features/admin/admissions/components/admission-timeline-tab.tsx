'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { cn } from '@/lib/utils/cn';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { createAdmissionActivity } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  formatAdmissionActivityNote,
  resolveActivityTypeLabel,
} from '../utils/admission-activity-display';
import { refName } from '../utils/admission-labels';
import type { AdmissionDetail, ActivityType } from '@/types/admission';

const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'whatsapp', 'follow_up', 'visit_note'];

function DateField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field admissions-date-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="date"
        className={cn('input input--date', !value && 'input--date-empty')}
        data-placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function AdmissionTimelineTab({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormat();
  const { activeSchoolId } = useAdminSession();
  const activities = detail.activities ?? [];
  const [activityType, setActivityType] = useState<ActivityType>('note');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const datePlaceholder = t('admin.admissions.create.datePlaceholder');

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionActivity(
      detail.id,
      {
        activity_type: activityType,
        note: note || undefined,
        next_action: nextAction || undefined,
        next_action_date: nextActionDate || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (res.success) {
      setNote('');
      setNextAction('');
      setNextActionDate('');
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  return (
    <div className="admissions-timeline-tab">
      <form className="card admissions-timeline-form" onSubmit={submitActivity}>
        <h3 className="admissions-timeline-form__title">{t('admin.admissions.timeline.addActivity')}</h3>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="admissions-timeline-form__grid">
          <div className="field">
            <label htmlFor="activity-type">{t('admin.admissions.timeline.activityType')}</label>
            <select
              id="activity-type"
              className="input"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {resolveActivityTypeLabel(type, t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="activity-note">{t('common.note')}</label>
            <input
              id="activity-note"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="activity-next-action">{t('admin.admissions.fields.nextAction')}</label>
            <input
              id="activity-next-action"
              className="input"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>
          <DateField
            id="activity-next-action-date"
            label={t('admin.admissions.fields.nextActionDate')}
            placeholder={datePlaceholder}
            value={nextActionDate}
            onChange={setNextActionDate}
          />
        </div>
        <div className="admissions-timeline-form__actions">
          <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
            {submitting ? t('common.submitting') : t('admin.admissions.timeline.submit')}
          </button>
        </div>
      </form>

      {activities.length === 0 ? (
        <EmptyState compact title={t('admin.admissions.timeline.empty')} />
      ) : (
        <div className="admissions-timeline">
          {activities.map((activity) => {
            const noteText = formatAdmissionActivityNote(activity.note, locale, t);
            const nextDate = activity.next_action_date
              ? formatDate(activity.next_action_date)
              : '';
            return (
              <article key={activity.id} className="admissions-timeline__item">
                <header className="admissions-timeline__item-head">
                  <strong>{resolveActivityTypeLabel(activity.activity_type, t)}</strong>
                  <time className="admissions-timeline__item-date" dateTime={activity.date}>
                    {formatDate(activity.date) || activity.date}
                  </time>
                </header>
                {noteText ? <p className="admissions-timeline__item-note">{noteText}</p> : null}
                <footer className="admissions-timeline__item-meta">
                  <span>{refName(activity.user) || t('admin.admissions.detail.unspecified')}</span>
                  {activity.next_action ? (
                    <span>
                      {t('admin.admissions.nextAction')}: {activity.next_action}
                      {nextDate ? ` — ${nextDate}` : ''}
                    </span>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
