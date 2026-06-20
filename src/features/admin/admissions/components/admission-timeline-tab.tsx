'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { createAdmissionActivity } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { refName } from '../utils/admission-labels';
import type { AdmissionDetail, ActivityType } from '@/types/admission';

const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'whatsapp', 'follow_up', 'visit_note'];

export function AdmissionTimelineTab({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const activities = detail.activities ?? [];
  const [activityType, setActivityType] = useState<ActivityType>('note');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="admissions-section">
      <form className="admissions-inline-form" onSubmit={submitActivity}>
        <h3 className="admissions-section__title">{t('admin.admissions.timeline.addActivity')}</h3>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="admissions-form-grid">
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
                  {t(`admin.admissions.activityTypes.${type}`)}
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
          <div className="field">
            <label htmlFor="activity-next-action-date">{t('admin.admissions.fields.nextActionDate')}</label>
            <input
              id="activity-next-action-date"
              type="date"
              className="input"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? t('common.submitting') : t('admin.admissions.timeline.submit')}
        </button>
      </form>

      {activities.length === 0 ? (
        <EmptyState compact title={t('admin.admissions.timeline.empty')} />
      ) : (
        <div className="admissions-timeline">
          {activities.map((activity) => (
            <article key={activity.id} className="admissions-timeline__item">
              <div>
                <strong>{t(`admin.admissions.activityTypes.${activity.activity_type}`)}</strong>
                <span className="muted"> · {activity.date}</span>
              </div>
              {activity.note && <p>{activity.note}</p>}
              <p className="tiny muted">
                {refName(activity.user) || t('common.dash')}
                {activity.next_action && (
                  <> · {t('admin.admissions.nextAction')}: {activity.next_action}</>
                )}
                {activity.next_action_date && <> · {activity.next_action_date}</>}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
