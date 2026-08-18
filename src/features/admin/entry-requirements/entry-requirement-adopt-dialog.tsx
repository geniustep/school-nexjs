'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { InfoBanner } from '@/components/ui/primitives';
import type {
  RequirementItem,
  RequirementList,
} from '@/features/entry-requirements/entry-requirements-contract';
import {
  buildAdoptTextbookAndLinkPayload,
  parseAdoptAmbiguity,
  type AdoptTextbookAndLinkResult,
  type AdoptTextbookOfferingCandidate,
  type AdoptTextbookReferenceCandidate,
} from '@/features/entry-requirements/entry-requirements-adopt-link';
import type { TeachingOfferingSubjectOption } from '@/features/entry-requirements/entry-requirements-offering-options';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { entryRequirementEndpoints } from '@/lib/api/entry-requirements-endpoints';
import type {
  AcademicContextOptionsResponse,
  TeachingLanguageOption,
} from '@/types/academic-context';

const ACADEMIC_CONFLICT_CODES = new Set([
  'entry_requirement_offering_reference_conflict',
  'teaching_offering_immutable',
  'teaching_reference_scope_mismatch',
  'teaching_offering_scope_mismatch',
]);

type Props = {
  open: boolean;
  list: RequirementList;
  item: RequirementItem;
  subjects: TeachingOfferingSubjectOption[];
  onClose: () => void;
  onSuccess: (result: AdoptTextbookAndLinkResult) => void | Promise<void>;
};

function referenceCandidateLabel(candidate: AdoptTextbookReferenceCandidate): string {
  return [candidate.title, candidate.publisher, candidate.edition, candidate.isbn]
    .filter(Boolean)
    .join(' · ');
}

function offeringCandidateLabel(candidate: AdoptTextbookOfferingCandidate): string {
  return [
    candidate.reference?.title,
    candidate.subject,
    candidate.teaching_language,
    candidate.academic_year,
  ].filter(Boolean).join(' · ');
}

function DetailCell({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: '10px 12px',
        border: '1px solid var(--c-border)',
        borderRadius: '10px',
        background: 'var(--c-surface)',
      }}
    >
      <span style={{ display: 'block', fontSize: '11px', color: 'var(--c-text-muted)', marginBottom: '3px' }}>
        {label}
      </span>
      <strong dir={ltr ? 'ltr' : 'auto'} style={{ display: 'block', color: 'var(--c-text)', overflowWrap: 'anywhere' }}>
        {value || '—'}
      </strong>
    </div>
  );
}

function StepLabel({ number, title, active, done }: {
  number: number;
  title: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
      <span
        aria-hidden="true"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '999px',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          fontSize: '12px',
          fontWeight: 800,
          color: done || active ? '#fff' : 'var(--c-text-muted)',
          background: done ? 'var(--c-green)' : active ? 'var(--c-primary)' : 'var(--c-surface-2)',
          border: done || active ? 'none' : '1px solid var(--c-border)',
        }}
      >
        {done ? '✓' : number}
      </span>
      <span style={{ fontSize: '12px', fontWeight: active ? 750 : 600, color: active ? 'var(--c-text)' : 'var(--c-text-muted)' }}>
        {title}
      </span>
    </div>
  );
}

export function EntryRequirementAdoptDialog({
  open,
  list,
  item,
  subjects,
  onClose,
  onSuccess,
}: Props) {
  const [subjectId, setSubjectId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [languages, setLanguages] = useState<TeachingLanguageOption[]>([]);
  const [languageRequired, setLanguageRequired] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [referenceCandidates, setReferenceCandidates] = useState<AdoptTextbookReferenceCandidate[]>([]);
  const [offeringCandidates, setOfferingCandidates] = useState<AdoptTextbookOfferingCandidate[]>([]);
  const [confirmReferenceId, setConfirmReferenceId] = useState('');
  const [confirmOfferingId, setConfirmOfferingId] = useState('');
  const [advancedReview, setAdvancedReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubjectId(item.subject_id ? String(item.subject_id) : '');
    setLanguageId('');
    setLanguages([]);
    setLanguageRequired(false);
    setLanguageLoading(false);
    setReferenceCandidates([]);
    setOfferingCandidates([]);
    setConfirmReferenceId('');
    setConfirmOfferingId('');
    setAdvancedReview(false);
    setSaving(false);
    setError('');
  }, [open, item.id, item.subject_id]);

  function clearAmbiguity() {
    setReferenceCandidates([]);
    setOfferingCandidates([]);
    setConfirmReferenceId('');
    setConfirmOfferingId('');
    setAdvancedReview(false);
  }

  async function loadTeachingLanguages(effectiveSubjectId: string) {
    if (!effectiveSubjectId) return;
    setLanguageLoading(true);
    const result = await api.get<AcademicContextOptionsResponse>(
      endpoints.admin.academicContextOptions,
      {
        academic_year_id: list.academic_year_id,
        level_id: list.level_id,
        track_id: list.track_id ?? undefined,
        subject_id: Number(effectiveSubjectId),
        scope: 'teaching_planning',
      },
    );
    setLanguageLoading(false);

    if (!result.success) {
      setLanguages([]);
      setError('تعذر تحميل لغات التدريس لهذا السياق. حاول مرة أخرى.');
      return;
    }

    const rows = result.data.teaching_languages ?? [];
    setLanguages(rows);
    if (rows.length === 1) setLanguageId(String(rows[0]!.id));
    if (rows.length === 0) {
      setError('لا توجد لغة تدريس متاحة لهذا المستوى والمادة. راجع الإعداد الأكاديمي.');
    }
  }

  async function submit() {
    if (saving) return;
    if (!subjectId) {
      setError('حدد المادة لربط الكتاب.');
      return;
    }
    if (languageRequired && !languageId) {
      setError('حدد لغة التدريس لربط الكتاب.');
      return;
    }
    if (referenceCandidates.length > 0 && !confirmReferenceId) {
      setError('اختر المرجع المعتمد للمتابعة.');
      return;
    }
    if (offeringCandidates.length > 0 && !confirmOfferingId) {
      setError('اختر المقرر المطلوب للمتابعة.');
      return;
    }

    setSaving(true);
    setError('');
    setAdvancedReview(false);
    const payload = buildAdoptTextbookAndLinkPayload({
      subjectId: item.subject_id ? undefined : subjectId,
      teachingLanguageId: languageId || undefined,
      confirmReferenceId: confirmReferenceId || undefined,
      confirmOfferingId: confirmOfferingId || undefined,
    });
    const result = await api.post<AdoptTextbookAndLinkResult>(
      entryRequirementEndpoints.admin.adoptTextbookAndLink(list.id, item.id),
      payload,
    );
    setSaving(false);

    if (result.success) {
      await onSuccess(result.data);
      return;
    }

    const code = result.error.code;
    const details = result.error.details as Record<string, unknown> | undefined;

    if (code === 'TEACHING_LANGUAGE_USER_CONFIRMATION_REQUIRED') {
      clearAmbiguity();
      setLanguageRequired(true);
      setError('حدد لغة التدريس لإكمال الربط.');
      await loadTeachingLanguages(subjectId);
      return;
    }

    if (code === 'entry_requirement_subject_confirmation_required') {
      clearAmbiguity();
      setError('حدد المادة لإكمال الربط.');
      return;
    }

    const ambiguity = parseAdoptAmbiguity(code, details);
    if (ambiguity) {
      if (ambiguity.candidateLimitExceeded || ambiguity.candidates.length === 0) {
        clearAmbiguity();
        setAdvancedReview(true);
        setError('توجد عدة إعدادات أكاديمية متشابهة. راجع المقررات المعتمدة قبل المتابعة.');
        return;
      }
      if (ambiguity.kind === 'reference') {
        setReferenceCandidates(ambiguity.candidates);
        setConfirmReferenceId('');
        setOfferingCandidates([]);
        setConfirmOfferingId('');
        setError('وجدنا أكثر من مرجع مطابق. اختر المرجع المعتمد.');
      } else {
        setOfferingCandidates(ambiguity.candidates);
        setConfirmOfferingId('');
        setError('وجدنا أكثر من مقرر مطابق. اختر المقرر المطلوب.');
      }
      return;
    }

    if (ACADEMIC_CONFLICT_CODES.has(code)) {
      setAdvancedReview(true);
      setError('يوجد إعداد أكاديمي متعارض لهذا الكتاب. راجع المقررات المعتمدة.');
      return;
    }

    if (code === 'forbidden' || code === 'permission_denied') {
      setError('لا تملك الصلاحيات الأكاديمية اللازمة لربط هذا الكتاب.');
      return;
    }

    if (code === 'network_error') {
      setError('تعذر الاتصال بالخادم. احتفظنا باختياراتك ويمكنك المحاولة مجددًا.');
      return;
    }

    setError(result.error.message || 'تعذر ربط الكتاب بالمقرر.');
  }

  const subjectName = item.subject
    || subjects.find((row) => String(row.id) === subjectId)?.name
    || '—';
  const bookTitle = item.title?.trim() || item.name;
  const needsChoice = languageRequired || referenceCandidates.length > 0 || offeringCandidates.length > 0;
  const stepTwoDone = !needsChoice && Boolean(subjectId);
  const activeStep = needsChoice ? 2 : 1;

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <ConfirmationDialog
      open
      size="form"
      closeOnBackdrop={!saving}
      title="ربط الكتاب بالمقرر"
      confirmLabel={needsChoice ? 'تأكيد الربط' : 'متابعة الربط'}
      cancelLabel="إلغاء"
      loading={saving}
      onConfirm={submit}
      onClose={onClose}
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            aria-label="خطوات الربط"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--c-surface-2)',
              border: '1px solid var(--c-border)',
            }}
          >
            <StepLabel number={1} title="معلومات الكتاب" active={activeStep === 1} done={activeStep > 1} />
            <StepLabel number={2} title="اختيارات الربط" active={activeStep === 2} done={stepTwoDone} />
            <StepLabel number={3} title="التأكيد" active={false} done={false} />
          </div>

          <section>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ display: 'block', color: 'var(--c-text)', fontSize: '14px' }}>المعلومات الأساسية</strong>
              <span style={{ color: 'var(--c-text-muted)', fontSize: '12px' }}>
                تحقق من بيانات الكتاب، ثم أكمل فقط الاختيارات التي يحتاجها النظام.
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '8px',
                padding: '12px',
                borderRadius: '12px',
                background: 'color-mix(in srgb, var(--c-primary-soft) 55%, white 45%)',
                border: '1px solid color-mix(in srgb, var(--c-primary) 18%, var(--c-border))',
              }}
            >
              <DetailCell label="عنوان الكتاب" value={bookTitle} />
              <DetailCell label="المستوى" value={list.level || '—'} />
              <DetailCell label="السنة الدراسية" value={list.academic_year || '—'} />
              <DetailCell label="المادة" value={subjectName} />
              {item.publisher ? <DetailCell label="الناشر" value={item.publisher} /> : null}
              {item.edition ? <DetailCell label="الطبعة" value={item.edition} /> : null}
              {item.isbn ? <DetailCell label="ISBN" value={item.isbn} ltr /> : null}
            </div>
          </section>

          {error ? <InfoBanner title={error} tone="amber" icon="!" /> : null}

          {!item.subject_id ? (
            <section
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--c-border)',
                background: 'var(--c-surface)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--c-text)' }}>1. تحديد المادة</strong>
              <label className="field" style={{ marginBottom: 0 }}>
                المادة
                <select
                  className="select"
                  value={subjectId}
                  disabled={saving}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSubjectId(next);
                    setLanguageId('');
                    setLanguages([]);
                    clearAmbiguity();
                    if (languageRequired && next) void loadTeachingLanguages(next);
                  }}
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </label>
            </section>
          ) : null}

          {languageRequired ? (
            <section
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--c-border)',
                background: 'var(--c-surface)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--c-text)' }}>2. لغة التدريس</strong>
              <label className="field" style={{ marginBottom: 0 }}>
                لغة التدريس
                <select
                  className="select"
                  value={languageId}
                  disabled={saving || languageLoading}
                  onChange={(event) => {
                    setLanguageId(event.target.value);
                    clearAmbiguity();
                  }}
                >
                  <option value="">{languageLoading ? 'جارٍ تحميل اللغات…' : 'اختر لغة التدريس'}</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.display_label || language.name}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          ) : null}

          {referenceCandidates.length > 0 ? (
            <section
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--c-border)',
                background: 'var(--c-surface)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--c-text)' }}>3. اختيار المرجع</strong>
              <div style={{ display: 'grid', gap: '8px' }}>
                {referenceCandidates.map((candidate) => (
                  <label
                    key={candidate.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: saving ? 'default' : 'pointer',
                      border: confirmReferenceId === String(candidate.id)
                        ? '1px solid var(--c-primary)'
                        : '1px solid var(--c-border)',
                      background: confirmReferenceId === String(candidate.id)
                        ? 'var(--c-primary-soft)'
                        : 'var(--c-surface)',
                    }}
                  >
                    <input
                      type="radio"
                      name="entry-requirement-reference-candidate"
                      value={candidate.id}
                      checked={confirmReferenceId === String(candidate.id)}
                      disabled={saving}
                      onChange={() => setConfirmReferenceId(String(candidate.id))}
                    />
                    <span dir="auto">{referenceCandidateLabel(candidate) || `#${candidate.id}`}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {offeringCandidates.length > 0 ? (
            <section
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--c-border)',
                background: 'var(--c-surface)',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--c-text)' }}>4. اختيار المقرر</strong>
              <div style={{ display: 'grid', gap: '8px' }}>
                {offeringCandidates.map((candidate) => (
                  <label
                    key={candidate.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: saving ? 'default' : 'pointer',
                      border: confirmOfferingId === String(candidate.id)
                        ? '1px solid var(--c-primary)'
                        : '1px solid var(--c-border)',
                      background: confirmOfferingId === String(candidate.id)
                        ? 'var(--c-primary-soft)'
                        : 'var(--c-surface)',
                    }}
                  >
                    <input
                      type="radio"
                      name="entry-requirement-offering-candidate"
                      value={candidate.id}
                      checked={confirmOfferingId === String(candidate.id)}
                      disabled={saving}
                      onChange={() => setConfirmOfferingId(String(candidate.id))}
                    />
                    <span dir="auto">{offeringCandidateLabel(candidate) || `#${candidate.id}`}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {!languageRequired && referenceCandidates.length === 0 && offeringCandidates.length === 0 ? (
            <InfoBanner
              title="سيبحث رقيم عن المرجع والمقرر المناسبين تلقائيًا"
              description="إذا احتاج الربط إلى معلومة إضافية، ستظهر لك الخطوة المطلوبة هنا دون مغادرة النافذة."
              icon="✓"
            />
          ) : null}

          {advancedReview ? (
            <a className="btn btn--ghost btn--sm" href="/admin/teaching-planning/offerings">
              مراجعة المقررات المعتمدة
            </a>
          ) : null}
        </div>
      }
    />,
    document.body,
  );
}
