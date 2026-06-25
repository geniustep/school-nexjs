'use client';

import { useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { patchAdmission } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { isOverdueNextAction } from '../utils/admission-labels';
import type { AdmissionDetail } from '@/types/admission';

export function AdmissionNextActionBox({
  detail,
  canEdit,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const { activeSchoolId } = useAdminSession();
  const overdue = isOverdueNextAction(detail.next_action_date);
  const empty = t('admin.admissions.detail.unspecified');
  const [editing, setEditing] = useState(false);
  const [nextAction, setNextAction] = useState(detail.next_action ?? '');
  const [nextActionDate, setNextActionDate] = useState(detail.next_action_date ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (activeSchoolId == null) return;
    setSaving(true);
    setError(null);
    const res = await patchAdmission(
      detail.id,
      {
        next_action: nextAction || undefined,
        next_action_date: nextActionDate || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSaving(false);
    if (res.success) {
      setEditing(false);
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  return (
    <section
      className={`admissions-next-action${overdue ? ' admissions-next-action--overdue' : ''}`}
      aria-labelledby="admission-next-action-title"
    >
      <h2 id="admission-next-action-title" className="admissions-section__title">
        {t('admin.admissions.nextAction')}
        {overdue && (
          <span className="badge badge--red admissions-next-action__badge">
            {t('admin.admissions.badges.overdue')}
          </span>
        )}
      </h2>

      {!editing ? (
        <>
          {detail.next_action || detail.next_action_date ? (
            <>
              {detail.next_action ? (
                <p className="admissions-next-action__text">{detail.next_action}</p>
              ) : null}
              {detail.next_action_date ? (
                <p className="muted admissions-next-action__date">{formatDate(detail.next_action_date)}</p>
              ) : null}
            </>
          ) : (
            <p className="muted admissions-next-action__empty">{empty}</p>
          )}
          {canEdit && (
            <button type="button" className="btn btn--sm" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </button>
          )}
        </>
      ) : (
        <div className="admissions-inline-form">
          {error && <div className="alert alert--error">{error}</div>}
          <div className="field">
            <label htmlFor="edit-next-action">{t('admin.admissions.fields.nextAction')}</label>
            <input
              id="edit-next-action"
              className="input"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-next-action-date">{t('admin.admissions.fields.nextActionDate')}</label>
            <input
              id="edit-next-action-date"
              type="date"
              className="input"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={save}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setEditing(false);
                setNextAction(detail.next_action ?? '');
                setNextActionDate(detail.next_action_date ?? '');
                setError(null);
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
