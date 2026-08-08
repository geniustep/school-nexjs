'use client';

/**
 * General school communication compose — group (259 content lifecycle) + individual (256).
 * Channel composer remains separate; no broad school/level/cycle scopes there.
 * Preview is advisory and optional; Submit remains authoritative on the backend.
 */

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentSearchPicker } from '@/features/admin/students/components/student-search-picker';
import { collectCyclesFromLevels } from '@/features/admin/class-form-utils';
import { fetchTeachers } from '@/features/admin/teachers/api/teacher-domain-api';
import { previewAdminRecipientScope } from '@/features/communication/api/admin-communication-api';
import {
  submitGroupGeneralCommunication,
  submitIndividualGeneralCommunication,
} from '@/features/communication/api/submit-general-communication';
import { RecipientPreviewDialog } from '@/features/communication/components/recipient-preview-dialog';
import {
  buildGroupRecipientScope,
  buildIndividualRecipientScope,
  isBeneficiaryAllowedForScopeLevel,
  schoolBeneficiaryKinds,
  sectionBeneficiaryKinds,
} from '@/features/communication/utils/recipient-scope';
import { communicationErrorMessageKey } from '@/features/channels/utils/communication-errors';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Level, LevelCycle, SchoolClass } from '@/types/class';
import type { Parent } from '@/types/parent';
import type { StudentSearchHit } from '@/types/student-search';
import type { TeacherSummary } from '@/types/teacher-domain';
import type { CommunicationRecipientSummary } from '@/types/communication';
import type {
  GeneralCommunicationMode,
  GroupScopeLevel,
  IndividualRecipientType,
  RecipientScope,
} from '@/types/recipient-scope';
import './general-communication-compose.css';

type ComposeContentType = 'announcement' | 'message';
type Phase = 'idle' | 'previewing' | 'submitting';
type EntityOption = { id: number; label: string };

function beneficiaryLabelKey(kind: string): string {
  switch (kind) {
    case 'everyone':
      return 'communication.general.beneficiary.everyone';
    case 'staff':
      return 'communication.general.beneficiary.staff';
    case 'teachers':
      return 'communication.general.beneficiary.teachers';
    case 'students':
      return 'communication.general.beneficiary.students';
    case 'guardians':
      return 'communication.general.beneficiary.guardians';
    case 'students_and_guardians':
      return 'communication.general.beneficiary.studentsAndGuardians';
    default:
      return 'communication.general.beneficiary.unknown';
  }
}

export function GeneralCommunicationComposeWorkspace({
  contentType = 'message',
}: {
  contentType?: ComposeContentType;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const formId = useId();
  const inFlightRef = useRef(false);
  const initialMode: GeneralCommunicationMode | null = contentType === 'announcement' ? 'group' : null;

  const [mode, setMode] = useState<GeneralCommunicationMode | null>(initialMode);
  const [scopeLevel, setScopeLevel] = useState<GroupScopeLevel | null>(null);
  const [beneficiaryKind, setBeneficiaryKind] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<number | null>(null);
  const [individualType, setIndividualType] = useState<IndividualRecipientType | null>(null);
  const [individualId, setIndividualId] = useState<number | null>(null);
  const [individualLabel, setIndividualLabel] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [classes, setClasses] = useState<EntityOption[]>([]);
  const [levels, setLevels] = useState<EntityOption[]>([]);
  const [cycles, setCycles] = useState<EntityOption[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);

  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherHits, setTeacherHits] = useState<TeacherSummary[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [parentQuery, setParentQuery] = useState('');
  const [parentHits, setParentHits] = useState<Parent[]>([]);
  const [parentsLoading, setParentsLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [previewSummary, setPreviewSummary] = useState<CommunicationRecipientSummary | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  const beneficiaryOptions = useMemo(() => {
    if (!scopeLevel) return [] as string[];
    return scopeLevel === 'school'
      ? [...schoolBeneficiaryKinds()]
      : [...sectionBeneficiaryKinds()];
  }, [scopeLevel]);

  const recipientScope: RecipientScope | null = useMemo(() => {
    if (mode === 'group') {
      return buildGroupRecipientScope({
        level: scopeLevel,
        beneficiaryKind,
        entityId,
      });
    }
    if (mode === 'individual' && individualType && individualId != null) {
      return buildIndividualRecipientScope(individualType, individualId);
    }
    return null;
  }, [mode, scopeLevel, beneficiaryKind, entityId, individualType, individualId]);

  function invalidatePreview() {
    setPreviewOpen(false);
    setPreviewSummary(null);
  }

  function resetSelectionPreservingMode(nextMode: GeneralCommunicationMode | null) {
    setMode(contentType === 'announcement' ? 'group' : nextMode);
    setScopeLevel(null);
    setBeneficiaryKind(null);
    setEntityId(null);
    setIndividualType(null);
    setIndividualId(null);
    setIndividualLabel(null);
    setTeacherQuery('');
    setTeacherHits([]);
    setParentQuery('');
    setParentHits([]);
    setDraftId(null);
    invalidatePreview();
  }

  useEffect(() => {
    if (mode !== 'group') return;
    if (scopeLevel !== 'class' && scopeLevel !== 'level' && scopeLevel !== 'cycle') return;

    let cancelled = false;
    setEntitiesLoading(true);
    setEntitiesError(null);

    void (async () => {
      if (scopeLevel === 'class') {
        const res = await api.get<SchoolClass[]>(endpoints.admin.classes, {
          page: 1,
          page_size: 200,
        });
        if (cancelled) return;
        if (!res.success) {
          setEntitiesError(t('communication.general.entitiesLoadFailed'));
          setClasses([]);
        } else {
          setClasses(
            (res.data ?? []).map((row) => ({
              id: row.id,
              label: row.name || String(row.id),
            })),
          );
        }
      } else {
        const res = await api.get<Level[]>(endpoints.admin.levels, {
          page: 1,
          page_size: 200,
        });
        if (cancelled) return;
        if (!res.success) {
          setEntitiesError(t('communication.general.entitiesLoadFailed'));
          setLevels([]);
          setCycles([]);
        } else {
          const rows = res.data ?? [];
          setLevels(
            rows.map((row) => ({
              id: row.id,
              label: row.display_name || row.name || String(row.id),
            })),
          );
          const cycleRows: LevelCycle[] = collectCyclesFromLevels(rows).filter((c) => c.id > 0);
          setCycles(
            cycleRows.map((c) => ({
              id: c.id,
              label: c.name || c.code || String(c.id),
            })),
          );
        }
      }
      setEntitiesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, scopeLevel, t]);

  useEffect(() => {
    if (mode !== 'individual' || individualType !== 'teacher') return;
    const q = teacherQuery.trim();
    if (q.length < 2) {
      setTeacherHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setTeachersLoading(true);
      void fetchTeachers({ page: 1, page_size: 20, search: q }).then((res) => {
        if (cancelled) return;
        setTeachersLoading(false);
        setTeacherHits(res.success ? res.data ?? [] : []);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, individualType, teacherQuery]);

  useEffect(() => {
    if (mode !== 'individual' || individualType !== 'guardian') return;
    const q = parentQuery.trim();
    if (q.length < 2) {
      setParentHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setParentsLoading(true);
      void api
        .get<Parent[]>(endpoints.admin.parents, { page: 1, page_size: 20, search: q })
        .then((res) => {
          if (cancelled) return;
          setParentsLoading(false);
          setParentHits(res.success ? res.data ?? [] : []);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, individualType, parentQuery]);

  function onScopeLevelChange(next: GroupScopeLevel) {
    setScopeLevel(next);
    setEntityId(null);
    if (beneficiaryKind && !isBeneficiaryAllowedForScopeLevel(next, beneficiaryKind)) {
      setBeneficiaryKind(null);
    }
    setDraftId(null);
    invalidatePreview();
  }

  function onSubjectChange(next: string) {
    setSubject(next);
    invalidatePreview();
  }

  function onBodyChange(next: string) {
    setBody(next);
    invalidatePreview();
  }

  function selectStudent(student: StudentSearchHit) {
    setIndividualId(student.id);
    setIndividualLabel(getStudentDisplayName(student));
    setDraftId(null);
    invalidatePreview();
  }

  function validateInput(): { subject: string; body: string; scope: RecipientScope } | null {
    if (!recipientScope) {
      toast.error(t('communication.general.incompleteSelection'));
      return null;
    }
    const nextSubject = subject.trim();
    const nextBody = body.trim();
    if (!nextSubject) {
      toast.error(t('communication.general.subjectRequired'));
      return null;
    }
    if (!nextBody) {
      toast.error(t('communication.general.bodyRequired'));
      return null;
    }
    return { subject: nextSubject, body: nextBody, scope: recipientScope };
  }

  async function requestPreview() {
    if (inFlightRef.current || phase !== 'idle') return;
    const input = validateInput();
    if (!input) return;

    inFlightRef.current = true;
    setPhase('previewing');
    const result = await previewAdminRecipientScope({
      recipient_scope: input.scope,
      subject: input.subject,
      body: input.body,
    });
    inFlightRef.current = false;
    setPhase('idle');

    if (!result.ok) {
      const key = communicationErrorMessageKey(result.error.code);
      toast.error(key ? t(key) : result.error.message || t('communication.general.previewFailed'));
      return;
    }

    setPreviewSummary(result.preview.recipient_summary);
    setPreviewOpen(true);
  }

  async function submitNow(e: React.FormEvent) {
    e.preventDefault();
    if (inFlightRef.current || phase !== 'idle') return;
    const input = validateInput();
    if (!input) return;

    inFlightRef.current = true;
    setPhase('submitting');
    const result =
      input.scope.scope_type === 'individual'
        ? await submitIndividualGeneralCommunication({
            scope: input.scope,
            subject: input.subject,
            body: input.body,
          })
        : await submitGroupGeneralCommunication({
            draftId,
            subject: input.subject,
            body: input.body,
            recipient_scope: input.scope,
          });
    inFlightRef.current = false;

    if (!result.ok) {
      setPhase('idle');
      if (result.draftId != null) setDraftId(result.draftId);
      const key = communicationErrorMessageKey(result.error.code);
      toast.error(key ? t(key) : result.error.message || t('communication.general.submitFailed'));
      return;
    }

    setPhase('idle');
    setDraftId(null);
    invalidatePreview();
    toast.success(
      result.outcome.kind === 'pending_review'
        ? t('communication.general.pendingReviewSuccess')
        : t('communication.general.acceptedSuccess'),
    );
    router.push('/admin/announcements');
  }

  function closePreview() {
    if (phase === 'previewing') return;
    setPreviewOpen(false);
    setPreviewSummary(null);
  }

  const needsEntity =
    mode === 'group' &&
    (scopeLevel === 'class' || scopeLevel === 'level' || scopeLevel === 'cycle');
  const entityOptions = scopeLevel === 'class' ? classes : scopeLevel === 'level' ? levels : cycles;
  const canAct =
    phase === 'idle' &&
    recipientScope != null &&
    subject.trim().length > 0 &&
    body.trim().length > 0;
  const inputBusy = phase !== 'idle';

  return (
    <div className="general-comm admin-workspace" data-testid="general-communication-compose">
      <header className="general-comm__header">
        <div>
          <p className="tiny general-comm__eyebrow">{t('channels.schoolCommunicationTitle')}</p>
          <h1>
            {contentType === 'announcement'
              ? t('communication.contentType.announcement')
              : t('communication.contentType.message')}
          </h1>
          <p className="muted">{t('communication.general.subtitle')}</p>
        </div>
        <Link href="/admin/announcements" className="btn btn--ghost btn--sm">
          {t('common.back')}
        </Link>
      </header>

      <div className="general-comm__layout">
        <div className="general-comm__setup">
          {contentType === 'message' ? (
            <section className="general-comm__card" aria-labelledby={`${formId}-mode`}>
              <h2 id={`${formId}-mode`}>{t('communication.general.chooseMode')}</h2>
              <div
                className="general-comm__mode-row"
                role="group"
                aria-label={t('communication.general.chooseMode')}
              >
                <button
                  type="button"
                  className={`btn btn--sm${mode === 'group' ? ' btn--primary' : ' btn--ghost'}`}
                  aria-pressed={mode === 'group'}
                  onClick={() => resetSelectionPreservingMode('group')}
                >
                  {t('communication.general.sendToGroup')}
                </button>
                <button
                  type="button"
                  className={`btn btn--sm${mode === 'individual' ? ' btn--primary' : ' btn--ghost'}`}
                  aria-pressed={mode === 'individual'}
                  onClick={() => resetSelectionPreservingMode('individual')}
                >
                  {t('communication.general.sendToPerson')}
                </button>
              </div>
            </section>
          ) : null}

          {mode === 'group' ? (
            <section className="general-comm__card" aria-labelledby={`${formId}-scope`}>
              <h2 id={`${formId}-scope`}>{t('communication.general.scopeTitle')}</h2>
              <div className="general-comm__stack">
                <label className="general-comm__field">
                  <span>{t('communication.general.scopeLevel')}</span>
                  <select
                    className="select"
                    value={scopeLevel ?? ''}
                    aria-label={t('communication.general.scopeLevel')}
                    disabled={inputBusy}
                    onChange={(e) => {
                      const value = e.target.value as GroupScopeLevel | '';
                      if (!value) {
                        setScopeLevel(null);
                        setBeneficiaryKind(null);
                        setEntityId(null);
                        setDraftId(null);
                        invalidatePreview();
                        return;
                      }
                      onScopeLevelChange(value);
                    }}
                  >
                    <option value="">{t('common.select')}</option>
                    <option value="school">{t('communication.general.scope.school')}</option>
                    <option value="class">{t('communication.general.scope.class')}</option>
                    <option value="level">{t('communication.general.scope.level')}</option>
                    <option value="cycle">{t('communication.general.scope.cycle')}</option>
                  </select>
                </label>

                {needsEntity ? (
                  <label className="general-comm__field">
                    <span>
                      {scopeLevel === 'class'
                        ? t('communication.general.pickClass')
                        : scopeLevel === 'level'
                          ? t('communication.general.pickLevel')
                          : t('communication.general.pickCycle')}
                    </span>
                    {entitiesLoading ? (
                      <p className="tiny" role="status">
                        {t('communication.general.entitiesLoading')}
                      </p>
                    ) : entitiesError ? (
                      <p className="tiny" role="alert">
                        {entitiesError}
                      </p>
                    ) : (
                      <select
                        className="select"
                        value={entityId ?? ''}
                        aria-label={t('communication.general.pickEntity')}
                        disabled={inputBusy}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setEntityId(raw ? Number(raw) : null);
                          setDraftId(null);
                          invalidatePreview();
                        }}
                      >
                        <option value="">{t('common.select')}</option>
                        {entityOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                ) : null}

                {scopeLevel ? (
                  <fieldset className="general-comm__fieldset" disabled={inputBusy}>
                    <legend>{t('communication.general.beneficiaries')}</legend>
                    <div className="general-comm__options">
                      {beneficiaryOptions.map((kind) => (
                        <label key={kind} className="general-comm__option">
                          <input
                            type="radio"
                            name="beneficiary"
                            value={kind}
                            checked={beneficiaryKind === kind}
                            onChange={() => {
                              setBeneficiaryKind(kind);
                              setDraftId(null);
                              invalidatePreview();
                            }}
                          />
                          <span>{t(beneficiaryLabelKey(kind))}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
              </div>
            </section>
          ) : null}

          {mode === 'individual' ? (
            <section className="general-comm__card" aria-labelledby={`${formId}-person`}>
              <h2 id={`${formId}-person`}>{t('communication.general.personTitle')}</h2>
              <div className="general-comm__stack">
                <fieldset className="general-comm__fieldset" disabled={inputBusy}>
                  <legend>{t('communication.general.personType')}</legend>
                  <div className="general-comm__options">
                    {(
                      [
                        ['teacher', 'communication.general.person.teacher'],
                        ['student', 'communication.general.person.student'],
                        ['guardian', 'communication.general.person.guardian'],
                      ] as const
                    ).map(([value, key]) => (
                      <label key={value} className="general-comm__option">
                        <input
                          type="radio"
                          name="personType"
                          value={value}
                          checked={individualType === value}
                          onChange={() => {
                            setIndividualType(value);
                            setIndividualId(null);
                            setIndividualLabel(null);
                            setTeacherQuery('');
                            setParentQuery('');
                            setDraftId(null);
                            invalidatePreview();
                          }}
                        />
                        <span>{t(key)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {individualType === 'student' ? (
                  <div className="general-comm__field">
                    <span>{t('communication.general.pickStudent')}</span>
                    <StudentSearchPicker
                      onSelect={selectStudent}
                      onClear={() => {
                        setIndividualId(null);
                        setIndividualLabel(null);
                        setDraftId(null);
                        invalidatePreview();
                      }}
                    />
                    {individualLabel ? (
                      <p className="tiny" dir="auto">
                        {t('communication.general.selected')}: {individualLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {individualType === 'teacher' ? (
                  <div className="general-comm__field">
                    <label>
                      <span>{t('communication.general.pickTeacher')}</span>
                      <input
                        className="input"
                        value={teacherQuery}
                        disabled={inputBusy}
                        onChange={(e) => setTeacherQuery(e.target.value)}
                        placeholder={t('communication.general.searchPlaceholder')}
                        aria-label={t('communication.general.pickTeacher')}
                      />
                    </label>
                    {teachersLoading ? (
                      <p className="tiny">{t('common.loading')}</p>
                    ) : (
                      <ul className="general-comm__hits" role="listbox">
                        {teacherHits.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              className="general-comm__hit"
                              disabled={inputBusy}
                              onClick={() => {
                                setIndividualId(row.id);
                                setIndividualLabel(row.name);
                                setDraftId(null);
                                invalidatePreview();
                              }}
                            >
                              <span dir="auto">{row.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {individualLabel ? (
                      <p className="tiny" dir="auto">
                        {t('communication.general.selected')}: {individualLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {individualType === 'guardian' ? (
                  <div className="general-comm__field">
                    <label>
                      <span>{t('communication.general.pickGuardian')}</span>
                      <input
                        className="input"
                        value={parentQuery}
                        disabled={inputBusy}
                        onChange={(e) => setParentQuery(e.target.value)}
                        placeholder={t('communication.general.searchPlaceholder')}
                        aria-label={t('communication.general.pickGuardian')}
                      />
                    </label>
                    {parentsLoading ? (
                      <p className="tiny">{t('common.loading')}</p>
                    ) : (
                      <ul className="general-comm__hits" role="listbox">
                        {parentHits.map((row) => {
                          const children =
                            Array.isArray(row.children) && row.children.length > 0
                              ? row.children
                                  .map((child) => child.name || getStudentDisplayName(child))
                                  .filter(Boolean)
                                  .join(' · ')
                              : null;
                          return (
                            <li key={row.id}>
                              <button
                                type="button"
                                className="general-comm__hit"
                                disabled={inputBusy}
                                onClick={() => {
                                  setIndividualId(row.id);
                                  setIndividualLabel(
                                    children
                                      ? `${row.display_name || row.name} — ${children}`
                                      : row.display_name || row.name,
                                  );
                                  setDraftId(null);
                                  invalidatePreview();
                                }}
                              >
                                <span dir="auto">{row.display_name || row.name}</span>
                                {children ? (
                                  <span className="tiny" dir="auto">
                                    {children}
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {individualLabel ? (
                      <p className="tiny" dir="auto">
                        {t('communication.general.selected')}: {individualLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        {mode ? (
          <section className="general-comm__card general-comm__message-card" aria-labelledby={`${formId}-message`}>
            <h2 id={`${formId}-message`}>
              {contentType === 'announcement'
                ? t('communication.contentType.announcement')
                : t('communication.general.messageTitle')}
            </h2>
            <form id={formId} className="general-comm__stack" onSubmit={(e) => void submitNow(e)}>
              <label className="general-comm__field">
                <span>{t('communication.general.subject')}</span>
                <input
                  className="input"
                  value={subject}
                  required
                  aria-required="true"
                  onChange={(e) => onSubjectChange(e.target.value)}
                  disabled={inputBusy}
                />
              </label>
              <label className="general-comm__field">
                <span>{t('communication.body')}</span>
                <textarea
                  className="textarea"
                  rows={10}
                  value={body}
                  required
                  aria-required="true"
                  onChange={(e) => onBodyChange(e.target.value)}
                  disabled={inputBusy}
                />
              </label>
              {recipientScope ? (
                <p className="tiny general-comm__summary" dir="auto">
                  {t('communication.general.beneficiaries')}:{' '}
                  {mode === 'group'
                    ? `${t(`communication.general.scope.${scopeLevel}`)} · ${t(
                        beneficiaryLabelKey(beneficiaryKind ?? ''),
                      )}`
                    : `${t(`communication.general.person.${individualType}`)}${
                        individualLabel ? ` · ${individualLabel}` : ''
                      }`}
                </p>
              ) : (
                <p className="tiny">{t('communication.general.incompleteSelection')}</p>
              )}
              <div className="form-actions general-comm__actions">
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!canAct || phase === 'submitting'}
                  aria-disabled={!canAct || phase === 'submitting'}
                >
                  {phase === 'submitting' ? t('common.submitting') : t('common.submit')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={!canAct || phase === 'previewing'}
                  aria-disabled={!canAct || phase === 'previewing'}
                  onClick={() => void requestPreview()}
                >
                  {phase === 'previewing'
                    ? t('communication.recipients.previewLoading')
                    : t('communication.general.previewAction')}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="general-comm__card general-comm__message-card">
            <p className="muted">{t('communication.general.incompleteSelection')}</p>
          </section>
        )}
      </div>

      <RecipientPreviewDialog
        open={previewOpen}
        summary={previewSummary}
        composeMode="unknown"
        loading={false}
        confirming={false}
        terminology="beneficiaries"
        previewOnly
        onClose={closePreview}
      />
    </div>
  );
}
