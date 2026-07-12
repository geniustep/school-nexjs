'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { Badge, InfoBanner } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import {
  acceptAdmissionOffer,
  createAdmissionOffer,
  declineAdmissionOffer,
  sendAdmissionOffer,
} from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { refName } from '../utils/admission-labels';
import { translateOfferStateLabel } from '../utils/admission-status-display';
import type { AdmissionDetail } from '@/types/admission';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';

export function AdmissionOffersTab({
  detail,
  allowedActions,
  onUpdated,
  hideEmptyState = false,
}: {
  detail: AdmissionDetail;
  allowedActions: AdmissionDetail['allowed_actions'];
  onUpdated: () => void;
  /** When true, omit the «no offers» empty state (e.g. offer not applicable). */
  hideEmptyState?: boolean;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const offers = detail.offers ?? [];
  const levelsState = useAdminResource<Ref[]>(endpoints.admin.levels, { page_size: 100 });
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 100 });
  const [open, setOpen] = useState(false);
  const [levelId, setLevelId] = useState('');
  const [classId, setClassId] = useState('');
  const [registrationFee, setRegistrationFee] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionOfferId, setActionOfferId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionOffer(
      detail.id,
      {
        level_id: levelId ? Number(levelId) : undefined,
        proposed_class_id: classId ? Number(classId) : undefined,
        registration_fee: registrationFee ? Number(registrationFee) : undefined,
        monthly_fee: monthlyFee ? Number(monthlyFee) : undefined,
        deadline_date: deadlineDate || undefined,
        required_documents: requiredDocuments || undefined,
        notes: notes || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (res.success) {
      setOpen(false);
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  async function runOfferAction(
    offerId: number,
    action: 'send' | 'accept' | 'decline',
  ) {
    if (activeSchoolId == null) return;
    setActionOfferId(offerId);
    setError(null);
    const query = { active_school_id: activeSchoolId };
    const res =
      action === 'send'
        ? await sendAdmissionOffer(detail.id, offerId, query)
        : action === 'accept'
          ? await acceptAdmissionOffer(detail.id, offerId, query)
          : await declineAdmissionOffer(detail.id, offerId, query);
    setActionOfferId(null);
    if (res.success) {
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  return (
    <div className="admissions-section">
      <InfoBanner
        title={t('admin.admissions.offers.acceptNoticeTitle')}
        description={t('admin.admissions.offers.acceptNotice')}
        tone="amber"
      />

      {error && <div className="alert alert--error">{error}</div>}

      {allowedActions.create_offer && (
        <>
          {!open ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
              {t('admin.admissions.offers.create')}
            </button>
          ) : (
            <form className="admissions-inline-form" onSubmit={submitCreate}>
              <h3 className="admissions-section__title">{t('admin.admissions.offers.create')}</h3>
              <div className="admissions-form-grid">
                <div className="field">
                  <label htmlFor="offer-level">{t('admin.admissions.fields.requestedLevel')}</label>
                  <select
                    id="offer-level"
                    className="input"
                    value={levelId}
                    onChange={(e) => setLevelId(e.target.value)}
                  >
                    <option value="">—</option>
                    {(levelsState.data ?? []).map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="offer-class">{t('admin.admissions.fields.requestedClass')}</label>
                  <select
                    id="offer-class"
                    className="input"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    <option value="">—</option>
                    {(classesState.data ?? []).map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="offer-reg-fee">{t('admin.admissions.offers.registrationFee')}</label>
                  <input
                    id="offer-reg-fee"
                    type="number"
                    className="input"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="offer-monthly">{t('admin.admissions.offers.monthlyFee')}</label>
                  <input
                    id="offer-monthly"
                    type="number"
                    className="input"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="offer-deadline">{t('admin.admissions.offers.deadline')}</label>
                  <input
                    id="offer-deadline"
                    type="date"
                    className="input"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="offer-docs">{t('admin.admissions.offers.requiredDocuments')}</label>
                <textarea
                  id="offer-docs"
                  className="input"
                  rows={2}
                  value={requiredDocuments}
                  onChange={(e) => setRequiredDocuments(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="offer-notes">{t('common.note')}</label>
                <textarea
                  id="offer-notes"
                  className="input"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
                  {submitting ? t('common.submitting') : t('common.save')}
                </button>
                <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {offers.length === 0 ? (
        hideEmptyState ? null : (
          <EmptyState compact title={t('admin.admissions.offers.empty')} />
        )
      ) : (
        <div className="stack gap-sm">
          {offers.map((offer) => (
            <div key={offer.id} className="card card--compact">
              <div className="between">
                <strong>{refName(offer.level) || t('admin.admissions.offers.offer')}</strong>
                <Badge tone="slate">
                  {translateOfferStateLabel(offer.state, t)}
                </Badge>
              </div>
              <dl className="admissions-dl">
                <dt>{t('admin.admissions.fields.requestedClass')}</dt>
                <dd>{refName(offer.proposed_class) || t('common.dash')}</dd>
                <dt>{t('admin.admissions.offers.registrationFee')}</dt>
                <dd>{offer.registration_fee ?? t('common.dash')}</dd>
                <dt>{t('admin.admissions.offers.monthlyFee')}</dt>
                <dd>{offer.monthly_fee ?? t('common.dash')}</dd>
                <dt>{t('admin.admissions.offers.deadline')}</dt>
                <dd>{offer.deadline_date ?? t('common.dash')}</dd>
              </dl>
              {offer.required_documents && <p>{offer.required_documents}</p>}
              {offer.notes && <p className="tiny muted">{offer.notes}</p>}
              <div className="form-actions">
                {allowedActions.send_offer && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={actionOfferId === offer.id}
                    onClick={() => runOfferAction(offer.id, 'send')}
                  >
                    {t('admin.admissions.offers.send')}
                  </button>
                )}
                {allowedActions.accept_offer && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={actionOfferId === offer.id}
                    onClick={() => runOfferAction(offer.id, 'accept')}
                  >
                    {t('admin.admissions.offers.accept')}
                  </button>
                )}
                {allowedActions.decline_offer && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={actionOfferId === offer.id}
                    onClick={() => runOfferAction(offer.id, 'decline')}
                  >
                    {t('admin.admissions.offers.decline')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
