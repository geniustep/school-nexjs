'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import {
  buildFullNamePreview,
  localizeStudentGenderOptions,
  todayIsoDate,
} from '@/features/admin/students/utils/student-profile';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { createAdmission } from '../api/admissions-api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import { buildAdmissionChildFullName } from '../utils/admission-child-name';
import {
  admissionOptionId,
  filterLevelsByCycle,
  filterStreamsByLevel,
  findAdmissionLevel,
  resolveDefaultAdmissionSourceId,
} from '../utils/admission-options';
import {
  buildCreateAdmissionPayload,
  emptyAdmissionCreateForm,
  type AdmissionCreateFormState,
} from '../utils/admission-create-payload';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import '../admissions.css';

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admissions-create-section">
      <h2 className="admissions-create-section__title">{title}</h2>
      <div className="admissions-create-grid">{children}</div>
    </section>
  );
}

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

export function AdmissionCreatePage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const today = useMemo(() => todayIsoDate(), []);
  const [form, setForm] = useState<AdmissionCreateFormState>(() => emptyAdmissionCreateForm(today));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const studentOptionsState = useStudentOptions();
  const admissionOptionsState = useAdmissionOptions();
  const admissionOptions = admissionOptionsState.options;

  const academicYears = admissionOptions?.academic_years ?? [];
  const cycles = admissionOptions?.cycles ?? [];
  const allLevels = admissionOptions?.levels ?? [];
  const allStreams = admissionOptions?.streams ?? [];

  const filteredLevels = useMemo(
    () => filterLevelsByCycle(allLevels, form.requested_cycle_code),
    [allLevels, form.requested_cycle_code],
  );

  const selectedLevel = useMemo(
    () => findAdmissionLevel(allLevels, form.requested_level_id),
    [allLevels, form.requested_level_id],
  );

  const showStreamField = Boolean(selectedLevel?.requires_stream);
  const filteredStreams = useMemo(
    () => filterStreamsByLevel(allStreams, form.requested_level_id),
    [allStreams, form.requested_level_id],
  );
  const genders = useMemo(
    () => localizeStudentGenderOptions(studentOptionsState.options?.genders ?? [], t),
    [studentOptionsState.options?.genders, t],
  );

  const childFullName = useMemo(
    () =>
      buildAdmissionChildFullName(
        form.child_first_name_ar,
        form.child_last_name_ar,
        form.child_first_name_fr,
        form.child_last_name_fr,
      ),
    [
      form.child_first_name_ar,
      form.child_last_name_ar,
      form.child_first_name_fr,
      form.child_last_name_fr,
    ],
  );

  useEffect(() => {
    if (defaultsApplied || !admissionOptionsState.options?.sources.length) return;
    const sourceId = resolveDefaultAdmissionSourceId(admissionOptionsState.options.sources);
    if (sourceId == null) {
      console.warn('[admissions] No admission sources available for default');
      setDefaultsApplied(true);
      return;
    }
    setForm((prev) => ({ ...prev, source_id: sourceId }));
    setDefaultsApplied(true);
  }, [admissionOptionsState.options?.sources, defaultsApplied]);

  const lookupError =
    studentOptionsState.error?.message ??
    admissionOptionsState.error?.message ??
    null;

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  const datePlaceholder = t('admin.admissions.create.datePlaceholder');

  function updateField<K extends keyof AdmissionCreateFormState>(
    key: K,
    value: AdmissionCreateFormState[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'requested_cycle_code') {
        next.requested_level_id = undefined;
        next.requested_stream_id = undefined;
      }
      if (key === 'requested_level_id') {
        next.requested_stream_id = undefined;
      }
      return next;
    });
  }

  function handleRequiredInvalid(e: React.InvalidEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity(t('admin.admissions.create.fieldRequired'));
  }

  function clearRequiredValidity(e: React.FormEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;
    setSubmitting(true);
    setError(null);

    const payload = buildCreateAdmissionPayload(form, activeSchoolId, allLevels);
    const res = await createAdmission(payload, { active_school_id: activeSchoolId });
    setSubmitting(false);

    if (res.success) {
      router.push(`/admin/admissions/${res.data.id}`);
      return;
    }

    const message = admissionApiErrorMessage(res.error, t);
    setError(
      message === t('errors.serverError') ? t('admin.admissions.create.submitError') : message,
    );
  }

  return (
    <div className="admissions-page admissions-create-page">
      <header className="admissions-create-header">
        <Link href="/admin/admissions" className="btn btn--ghost admissions-create-header__back">
          {t('common.back')}
        </Link>
        <div className="admissions-create-header__main">
          <h1 className="admissions-create-header__title">{t('admin.admissions.create.title')}</h1>
          <p className="admissions-create-header__subtitle">{t('admin.admissions.create.subtitle')}</p>
        </div>
      </header>

      <form className="card admissions-create-card" onSubmit={handleSubmit} lang={locale}>
        {lookupError && (
          <div className="alert alert--warning" role="status">
            {lookupError}
          </div>
        )}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <FormSection title={t('admin.admissions.create.studentSection')}>
          <div className="field">
            <label htmlFor="child_first_name_ar">
              {t('admin.admissions.fields.firstNameAr')} <span aria-hidden="true">*</span>
            </label>
            <input
              id="child_first_name_ar"
              className="input"
              required
              value={form.child_first_name_ar}
              onChange={(e) => updateField('child_first_name_ar', e.target.value)}
              onInvalid={handleRequiredInvalid}
              onInput={clearRequiredValidity}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="child_last_name_ar">
              {t('admin.admissions.fields.lastNameAr')} <span aria-hidden="true">*</span>
            </label>
            <input
              id="child_last_name_ar"
              className="input"
              required
              value={form.child_last_name_ar}
              onChange={(e) => updateField('child_last_name_ar', e.target.value)}
              onInvalid={handleRequiredInvalid}
              onInput={clearRequiredValidity}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="child_first_name_fr">{t('admin.admissions.fields.firstNameFr')}</label>
            <input
              id="child_first_name_fr"
              className="input"
              dir="ltr"
              value={form.child_first_name_fr}
              onChange={(e) => updateField('child_first_name_fr', e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="child_last_name_fr">{t('admin.admissions.fields.lastNameFr')}</label>
            <input
              id="child_last_name_fr"
              className="input"
              dir="ltr"
              value={form.child_last_name_fr}
              onChange={(e) => updateField('child_last_name_fr', e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field admissions-create-grid__wide admissions-create-full-name">
            <span className="admissions-create-full-name__label">{t('admin.admissions.fields.fullName')}</span>
            <span className="admissions-create-full-name__value" dir="auto">
              {childFullName || t('common.dash')}
            </span>
            {form.child_first_name_fr || form.child_last_name_fr ? (
              <span className="tiny muted" dir="ltr">
                {buildFullNamePreview(form.child_first_name_fr, form.child_last_name_fr) ||
                  t('common.dash')}
              </span>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="gender">{t('admin.admissions.fields.gender')}</label>
            <select
              id="gender"
              className="input"
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value)}
              disabled={studentOptionsState.loading}
            >
              <option value="">{t('admin.admissions.create.selectGender')}</option>
              {genders.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <DateField
            id="birth_date"
            label={t('admin.admissions.fields.birthDate')}
            placeholder={datePlaceholder}
            value={form.birth_date}
            onChange={(value) => updateField('birth_date', value)}
          />
          <div className="field">
            <label htmlFor="massar_code">{t('admin.admissions.fields.massarCode')}</label>
            <input
              id="massar_code"
              className="input"
              dir="ltr"
              value={form.massar_code}
              onChange={(e) => updateField('massar_code', e.target.value.replace(/\s/g, ''))}
            />
          </div>
          <div className="field admissions-create-grid__wide">
            <label htmlFor="previous_school">{t('admin.admissions.fields.previousSchool')}</label>
            <input
              id="previous_school"
              className="input"
              value={form.previous_school}
              onChange={(e) => updateField('previous_school', e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title={t('admin.admissions.create.studySection')}>
          <div className="field">
            <label htmlFor="academic_year_id">{t('admin.admissions.fields.academicYear')}</label>
            <select
              id="academic_year_id"
              className="input"
              value={form.academic_year_id ?? ''}
              onChange={(e) =>
                updateField('academic_year_id', e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={admissionOptionsState.loading}
            >
              <option value="">{t('admin.admissions.create.selectAcademicYear')}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="requested_cycle_code">{t('admin.admissions.fields.cycle')}</label>
            <select
              id="requested_cycle_code"
              className="input"
              value={form.requested_cycle_code}
              onChange={(e) => updateField('requested_cycle_code', e.target.value)}
              disabled={admissionOptionsState.loading}
            >
              <option value="">{t('admin.admissions.create.selectCycle')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.code} value={cycle.code}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="requested_level_id">{t('admin.admissions.fields.requestedLevel')}</label>
            <select
              id="requested_level_id"
              className="input"
              value={form.requested_level_id ?? ''}
              onChange={(e) =>
                updateField('requested_level_id', e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={admissionOptionsState.loading || !form.requested_cycle_code}
            >
              <option value="">{t('admin.admissions.create.selectLevel')}</option>
              {filteredLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
          {showStreamField ? (
            <div className="field">
              <label htmlFor="requested_stream_id">{t('admin.admissions.fields.stream')}</label>
              <select
                id="requested_stream_id"
                className="input"
                value={form.requested_stream_id ?? ''}
                onChange={(e) =>
                  updateField(
                    'requested_stream_id',
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                disabled={admissionOptionsState.loading}
                required
              >
                <option value="">{t('admin.admissions.create.selectStream')}</option>
                {filteredStreams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
              <p className="tiny muted">{t('admin.admissions.create.streamRequiredHint')}</p>
            </div>
          ) : null}
        </FormSection>

        <FormSection title={t('admin.admissions.create.guardianSection')}>
          <div className="field">
            <label htmlFor="guardian_name">{t('admin.admissions.fields.guardianName')}</label>
            <input
              id="guardian_name"
              className="input"
              value={form.guardian_name}
              onChange={(e) => updateField('guardian_name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="guardian_phone">{t('admin.admissions.fields.guardianPhone')}</label>
            <input
              id="guardian_phone"
              className="input"
              dir="ltr"
              value={form.guardian_phone}
              onChange={(e) => updateField('guardian_phone', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="guardian_relationship">{t('admin.admissions.fields.relationship')}</label>
            {relationshipLoadFailed ? (
              <p className="tiny muted" role="status">
                {t('admin.admissions.create.relationshipLoadError')}
              </p>
            ) : (
              <select
                id="guardian_relationship"
                className="input"
                value={form.guardian_relationship}
                onChange={(e) => updateField('guardian_relationship', e.target.value)}
                disabled={admissionOptionsState.loading}
              >
                <option value="">{t('admin.admissions.create.selectRelationship')}</option>
                {(admissionOptionsState.options?.relationships ?? []).map((rel) => {
                  const value = String(rel.value ?? rel.id ?? '');
                  return (
                    <option key={value} value={value}>
                      {rel.label}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          <div className="field">
            <label htmlFor="guardian_email">{t('admin.admissions.fields.guardianEmail')}</label>
            <input
              id="guardian_email"
              type="email"
              className="input"
              dir="ltr"
              value={form.guardian_email}
              onChange={(e) => updateField('guardian_email', e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title={t('admin.admissions.create.followUpSection')}>
          <div className="field">
            <label htmlFor="source_id">{t('admin.admissions.fields.source')}</label>
            <select
              id="source_id"
              className="input"
              value={form.source_id ?? ''}
              onChange={(e) =>
                updateField('source_id', e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={admissionOptionsState.loading}
            >
              <option value="">{t('admin.admissions.create.selectSource')}</option>
              {(admissionOptionsState.options?.sources ?? []).map((source) => {
                const id = admissionOptionId(source);
                if (id == null) return null;
                return (
                  <option key={id} value={id}>
                    {source.label}
                  </option>
                );
              })}
            </select>
          </div>
          <DateField
            id="first_contact_date"
            label={t('admin.admissions.fields.firstVisitDate')}
            placeholder={datePlaceholder}
            value={form.first_contact_date}
            onChange={(value) => updateField('first_contact_date', value)}
          />
          <div className="field">
            <label htmlFor="next_action">{t('admin.admissions.fields.nextAction')}</label>
            <input
              id="next_action"
              className="input"
              value={form.next_action}
              onChange={(e) => updateField('next_action', e.target.value)}
            />
          </div>
          <DateField
            id="next_action_date"
            label={t('admin.admissions.fields.nextActionDate')}
            placeholder={datePlaceholder}
            value={form.next_action_date}
            onChange={(value) => updateField('next_action_date', value)}
          />
        </FormSection>

        <section className="admissions-create-section admissions-create-section--notes">
          <h2 className="admissions-create-section__title">{t('admin.admissions.create.notesSection')}</h2>
          <div className="field">
            <label htmlFor="internal_notes">{t('admin.admissions.fields.internalNotes')}</label>
            <textarea
              id="internal_notes"
              className="input"
              rows={3}
              value={form.internal_notes}
              onChange={(e) => updateField('internal_notes', e.target.value)}
            />
          </div>
        </section>

        <div className="admissions-create-actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('admin.admissions.create.submitting') : t('admin.admissions.create.submit')}
          </button>
          <Link href="/admin/admissions" className="btn">
            {t('admin.admissions.create.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
