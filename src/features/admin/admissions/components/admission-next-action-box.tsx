'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { patchAdmission } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { cleanDisplayValue, isOverdueNextAction } from '../utils/admission-labels';
import type { AdmissionDetail } from '@/types/admission';

function toDateInputValue(value: unknown): string {
  const cleaned = cleanDisplayValue(value);
  if (!cleaned) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function hasNextActionContent(detail: AdmissionDetail): boolean {
  return Boolean(cleanDisplayValue(detail.next_action) || cleanDisplayValue(detail.next_action_date));
}

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
  const overdue = isOverdueNextAction(cleanDisplayValue(detail.next_action_date) || undefined);
  const [editing, setEditing] = useState(false);
  const [nextAction, setNextAction] = useState(() => cleanDisplayValue(detail.next_action));
  const [nextActionDate, setNextActionDate] = useState(() => toDateInputValue(detail.next_action_date));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const hasContent = hasNextActionContent(detail);
  const actionText = cleanDisplayValue(detail.next_action);
  const actionDate = cleanDisplayValue(detail.next_action_date);

  useEffect(() => {
    setNextAction(cleanDisplayValue(detail.next_action));
    setNextActionDate(toDateInputValue(detail.next_action_date));
    if (hasNextActionContent(detail)) {
      setHidden(false);
    }
  }, [detail.id, detail.next_action, detail.next_action_date]);

  async function persistNextAction(action: string, actionDate: string) {
    if (activeSchoolId == null) return;
    setSaving(true);
    setError(null);
    const res = await patchAdmission(
      detail.id,
      {
        next_action: action,
        next_action_date: actionDate,
      },
      { active_school_id: activeSchoolId },
    );
    setSaving(false);
    if (res.success) {
      setEditing(false);
      if (!action.trim() && !actionDate.trim()) {
        setHidden(true);
      }
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  async function save() {
    await persistNextAction(nextAction, nextActionDate);
  }

  async function markDone() {
    await persistNextAction('', '');
  }

  if ((hidden || !hasContent) && !editing) {
    return null;
  }

  return (
    <section
      className={`card admissions-next-action${overdue ? ' admissions-next-action--overdue' : ''}`}
      aria-labelledby="admission-next-action-title"
    >
      {!editing ? (
        <div className="admissions-next-action__row">
          <div className="admissions-next-action__main">
            <h2 id="admission-next-action-title" className="admissions-next-action__title">
              {t('admin.admissions.nextAction')}
              {overdue ? (
                <span className="badge badge--red admissions-next-action__badge">
                  {t('admin.admissions.badges.overdue')}
                </span>
              ) : null}
            </h2>
            {hasContent ? (
              <p className="admissions-next-action__inline">
                {actionText ? (
                  <span className="admissions-next-action__text">{actionText}</span>
                ) : null}
                {actionText && actionDate ? (
                  <span className="admissions-next-action__sep" aria-hidden="true">
                    —
                  </span>
                ) : null}
                {actionDate ? (
                  <time
                    className={`admissions-next-action__date${overdue ? ' admissions-next-action__date--overdue' : ''}`}
                    dateTime={actionDate}
                  >
                    {formatDate(actionDate)}
                  </time>
                ) : null}
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <div className="admissions-next-action__actions">
              {hasContent ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={saving}
                  onClick={markDone}
                >
                  {saving ? t('common.saving') : t('admin.admissions.markNextActionDone')}
                </button>
              ) : null}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                {t('common.edit')}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="admissions-next-action__edit">
          {error ? <div className="alert alert--error">{error}</div> : null}
          <div className="admissions-next-action__edit-fields">
            <div className="field admissions-next-action__field">
              <label htmlFor="edit-next-action">{t('admin.admissions.fields.nextAction')}</label>
              <input
                id="edit-next-action"
                className="input"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
              />
            </div>
            <div className="field admissions-next-action__field">
              <label htmlFor="edit-next-action-date">{t('admin.admissions.fields.nextActionDate')}</label>
              <input
                id="edit-next-action-date"
                type="date"
                className="input"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
              />
            </div>
          </div>
          <div className="admissions-next-action__edit-actions">
            <button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={save}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setNextAction(cleanDisplayValue(detail.next_action));
                setNextActionDate(toDateInputValue(detail.next_action_date));
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
