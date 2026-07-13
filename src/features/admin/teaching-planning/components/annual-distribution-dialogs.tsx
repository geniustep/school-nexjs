'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Create/edit an Annual Distribution. A distribution belongs to one Teaching
 * Offering and represents the year-long instructional plan — it is NOT a
 * timetable requirement.
 */

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import {
  createAnnualDistribution,
  updateAnnualDistribution,
} from '@/features/admin/teaching-planning/api/annual-distributions-api';
import { normalizeTeachingOfferings } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import type {
  AnnualDistributionCreatePayload,
  AnnualDistributionDetail,
  TeachingOfferingSummary,
} from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

export function AnnualDistributionEditorDialog({
  open,
  mode,
  initial,
  lockedOffering,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: AnnualDistributionDetail | null;
  /** Pre-select and lock the offering (e.g. launched from an offering detail). */
  lockedOffering?: TeachingOfferingSummary | null;
  onClose: () => void;
  onSaved: (item: AnnualDistributionDetail) => void;
}) {
  const t = useT();
  const offeringsState = useAdminResource(
    open && mode === 'create' && !lockedOffering ? endpoints.admin.teachingOfferings : null,
    { page_size: 200 },
  );
  const offerings = useMemo(
    () => normalizeTeachingOfferings(offeringsState.data),
    [offeringsState.data],
  );

  const [offeringId, setOfferingId] = useState('');
  const [name, setName] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setOfferingId(
      lockedOffering?.id
        ? String(lockedOffering.id)
        : initial?.offering?.id
          ? String(initial.offering.id)
          : '',
    );
    setName(initial?.name ?? '');
    setPeriodLabel(initial?.period_label ?? '');
    setDateStart(initial?.date_start ?? '');
    setDateEnd(initial?.date_end ?? '');
    setVersionLabel(initial?.version_label ?? '');
    setNotes(initial?.notes ?? '');
  }, [open, initial, lockedOffering]);

  async function handleConfirm() {
    if (saving) return;
    if (mode === 'create' && !offeringId) {
      setError(t('admin.teachingPlanning.distributions.validation.offeringRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    let res;
    if (mode === 'create') {
      const payload: AnnualDistributionCreatePayload = {
        offering_id: Number(offeringId),
        name: name.trim() || null,
        period_label: periodLabel.trim() || null,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        version_label: versionLabel.trim() || null,
        notes: notes.trim() || null,
      };
      res = await createAnnualDistribution(payload);
    } else {
      res = await updateAnnualDistribution(initial!.id, {
        name: name.trim() || null,
        period_label: periodLabel.trim() || null,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        version_label: versionLabel.trim() || null,
        notes: notes.trim() || null,
      });
    }
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onSaved(res.data);
    onClose();
  }

  const lockedLabel = lockedOffering?.display_name ?? initial?.offering?.display_name ?? '';
  const offeringLocked = mode === 'edit' || Boolean(lockedOffering);

  return (
    <ConfirmationDialog
      open={open}
      size="form"
      title={
        mode === 'create'
          ? t('admin.teachingPlanning.distributions.createTitle')
          : t('admin.teachingPlanning.distributions.editTitle')
      }
      body={
        <div className="teaching-planning-dialog">
          {error ? <p className="form-error">{error}</p> : null}

          <section
            className="teaching-planning-dialog__section"
            aria-labelledby="distribution-identity"
          >
            <h4 id="distribution-identity" className="teaching-planning-dialog__section-title">
              {t('admin.teachingPlanning.distributions.dialog.identitySection')}
            </h4>

            {offeringLocked ? (
              <div className="teaching-planning-dialog__school">
                <span className="teaching-planning-dialog__school-label">
                  {t('admin.teachingPlanning.distributions.fields.offering')}
                </span>
                <span className="teaching-planning-dialog__school-value" dir="auto">
                  {lockedLabel || t('common.dash')}
                </span>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="distribution-offering">
                  {t('admin.teachingPlanning.distributions.fields.offering')}
                </label>
                <select
                  id="distribution-offering"
                  className="select"
                  value={offeringId}
                  onChange={(e) => setOfferingId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">
                    {t('admin.teachingPlanning.distributions.fields.offeringPlaceholder')}
                  </option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="teaching-planning-dialog__row">
              <div className="field">
                <label htmlFor="distribution-name">
                  {t('admin.teachingPlanning.distributions.fields.name')}
                </label>
                <input
                  id="distribution-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  dir="auto"
                  disabled={saving}
                  placeholder={t('admin.teachingPlanning.distributions.fields.namePlaceholder')}
                />
              </div>
              <div className="field">
                <label htmlFor="distribution-period">
                  {t('admin.teachingPlanning.distributions.fields.periodLabel')}
                </label>
                <input
                  id="distribution-period"
                  className="input"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  dir="auto"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="distribution-version">
                {t('admin.teachingPlanning.fields.versionLabel')}
              </label>
              <input
                id="distribution-version"
                className="input"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                dir="auto"
                disabled={saving}
              />
            </div>
          </section>

          <section
            className="teaching-planning-dialog__section"
            aria-labelledby="distribution-dates"
          >
            <h4 id="distribution-dates" className="teaching-planning-dialog__section-title">
              {t('admin.teachingPlanning.distributions.dialog.datesSection')}
            </h4>
            <div className="teaching-planning-dialog__row">
              <div className="field">
                <label htmlFor="distribution-date-start">
                  {t('admin.teachingPlanning.distributions.fields.dateStart')}
                </label>
                <DatePickerInput
                  id="distribution-date-start"
                  value={dateStart}
                  onChange={setDateStart}
                  disabled={saving}
                  presets={false}
                />
              </div>
              <div className="field">
                <label htmlFor="distribution-date-end">
                  {t('admin.teachingPlanning.distributions.fields.dateEnd')}
                </label>
                <DatePickerInput
                  id="distribution-date-end"
                  value={dateEnd}
                  onChange={setDateEnd}
                  disabled={saving}
                  presets={false}
                  min={dateStart || undefined}
                />
              </div>
            </div>
          </section>

          <section
            className="teaching-planning-dialog__section"
            aria-labelledby="distribution-notes"
          >
            <h4 id="distribution-notes" className="teaching-planning-dialog__section-title">
              {t('admin.teachingPlanning.distributions.dialog.notesSection')}
            </h4>
            <div className="field">
              <label htmlFor="distribution-notes-field">
                {t('admin.teachingPlanning.fields.notes')}
              </label>
              <textarea
                id="distribution-notes-field"
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                dir="auto"
                rows={3}
                disabled={saving}
              />
            </div>
          </section>
        </div>
      }
      confirmLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
      onConfirm={handleConfirm}
      onClose={onClose}
      loading={saving}
    />
  );
}
