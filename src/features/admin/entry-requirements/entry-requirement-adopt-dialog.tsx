'use client';

import { useEffect, useState } from 'react';

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
import styles from './entry-requirements-workspace.module.css';

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
      setError('حدد المادة لاعتماد الكتاب وربطه.');
      return;
    }
    if (languageRequired && !languageId) {
      setError('حدد لغة التدريس لاعتماد الكتاب وربطه.');
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
      setError('حدد لغة التدريس لاعتماد الكتاب وربطه.');
      await loadTeachingLanguages(subjectId);
      return;
    }

    if (code === 'entry_requirement_subject_confirmation_required') {
      clearAmbiguity();
      setError('حدد المادة لاعتماد الكتاب وربطه.');
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
      setError('لا تملك الصلاحيات الأكاديمية اللازمة لاعتماد هذا الكتاب وربطه.');
      return;
    }

    if (code === 'network_error') {
      setError('تعذر الاتصال بالخادم. احتفظنا باختياراتك ويمكنك المحاولة مجددًا.');
      return;
    }

    setError(result.error.message || 'تعذر اعتماد الكتاب وربطه.');
  }

  const subjectName = item.subject
    || subjects.find((row) => String(row.id) === subjectId)?.name
    || '—';
  const bookTitle = item.title?.trim() || item.name;

  return (
    <ConfirmationDialog
      open={open}
      size="form"
      closeOnBackdrop={!saving}
      title="اعتماد الكتاب وربطه"
      confirmLabel="اعتماد وربط"
      cancelLabel="إلغاء"
      loading={saving}
      onConfirm={submit}
      onClose={onClose}
      body={
        <div className={styles.editorPanel}>
          {error ? <InfoBanner title={error} tone="amber" icon="!" /> : null}

          <div className={styles.formGrid}>
            <div className="field">
              <span>عنوان الكتاب</span>
              <strong dir="auto">{bookTitle}</strong>
            </div>
            <div className="field">
              <span>المستوى</span>
              <strong dir="auto">{list.level || '—'}</strong>
            </div>
            <div className="field">
              <span>السنة الدراسية</span>
              <strong dir="auto">{list.academic_year || '—'}</strong>
            </div>
            {item.subject_id ? (
              <div className="field">
                <span>المادة</span>
                <strong dir="auto">{subjectName}</strong>
              </div>
            ) : (
              <label className="field">
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
            )}
            {item.publisher ? (
              <div className="field"><span>الناشر</span><strong dir="auto">{item.publisher}</strong></div>
            ) : null}
            {item.edition ? (
              <div className="field"><span>الطبعة</span><strong dir="auto">{item.edition}</strong></div>
            ) : null}
            {item.isbn ? (
              <div className="field"><span>ISBN</span><bdi dir="ltr">{item.isbn}</bdi></div>
            ) : null}
          </div>

          {languageRequired ? (
            <label className="field">
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
          ) : null}

          {referenceCandidates.length > 0 ? (
            <div className="field">
              <span>المرجع المعتمد</span>
              {referenceCandidates.map((candidate) => (
                <label key={candidate.id}>
                  <input
                    type="radio"
                    name="entry-requirement-reference-candidate"
                    value={candidate.id}
                    checked={confirmReferenceId === String(candidate.id)}
                    disabled={saving}
                    onChange={() => setConfirmReferenceId(String(candidate.id))}
                  />{' '}
                  <span dir="auto">{referenceCandidateLabel(candidate) || `#${candidate.id}`}</span>
                </label>
              ))}
            </div>
          ) : null}

          {offeringCandidates.length > 0 ? (
            <div className="field">
              <span>المقرر المطلوب</span>
              {offeringCandidates.map((candidate) => (
                <label key={candidate.id}>
                  <input
                    type="radio"
                    name="entry-requirement-offering-candidate"
                    value={candidate.id}
                    checked={confirmOfferingId === String(candidate.id)}
                    disabled={saving}
                    onChange={() => setConfirmOfferingId(String(candidate.id))}
                  />{' '}
                  <span dir="auto">{offeringCandidateLabel(candidate) || `#${candidate.id}`}</span>
                </label>
              ))}
            </div>
          ) : null}

          {advancedReview ? (
            <a className="btn btn--ghost btn--sm" href="/admin/teaching-planning/offerings">
              مراجعة المقررات المعتمدة
            </a>
          ) : null}
        </div>
      }
    />
  );
}
