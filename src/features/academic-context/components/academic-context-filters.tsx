'use client';

/**
 * Shared hierarchical Academic Context filters.
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 */

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import {
  useAcademicContextOptions,
  type AcademicContextAudience,
  type UseAcademicContextOptionsResult,
} from '@/features/academic-context/hooks/use-academic-context-options';
import {
  formatClassContextLabel,
  formatEffectiveSubjectLabel,
  formatLanguageOptionLabel,
  formatLevelContextLabel,
  formatOfferingContextLabel,
  formatReferenceContextLabel,
  formatTermOptionLabel,
} from '@/features/academic-context/utils/academic-context-display';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { canManageTeachingOfferings, canManageTeachingReferences } from '@/lib/permissions/teaching-planning';
import type {
  AcademicContextScope,
  AcademicContextSelection,
} from '@/types/academic-context';
import './academic-context-filters.css';

export type AcademicContextFiltersProps = {
  audience?: AcademicContextAudience;
  scope?: AcademicContextScope;
  includeInactive?: boolean;
  layout?: 'standard' | 'compact';
  showAcademicYear?: boolean;
  showCycle?: boolean;
  showLevel?: boolean;
  showTrack?: boolean;
  showTeachingLanguage?: boolean;
  showSubject?: boolean;
  showOffering?: boolean;
  showReference?: boolean;
  showTerm?: boolean;
  showClass?: boolean;
  /** Class before Subject (assignment/timetable). */
  classBeforeSubject?: boolean;
  requiredFields?: Array<
    | 'academicYear'
    | 'cycle'
    | 'level'
    | 'track'
    | 'teachingLanguage'
    | 'subject'
    | 'offering'
    | 'reference'
    | 'term'
    | 'class'
  >;
  selection?: AcademicContextSelection;
  onSelectionChange?: (next: AcademicContextSelection) => void;
  initialSelection?: Partial<AcademicContextSelection>;
  enabled?: boolean;
  /** Allow injecting an already-running hook result (advanced). */
  controller?: UseAcademicContextOptionsResult;
  idPrefix?: string;
  className?: string;
};

function FieldShell({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="academic-context-filters__field">
      <label htmlFor={id} className="academic-context-filters__label">
        {label}
        {required ? (
          <span className="academic-context-filters__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p className="academic-context-filters__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AcademicContextFilters(props: AcademicContextFiltersProps) {
  const t = useT();
  const user = useSession();
  const reactId = useId();
  const prefix = props.idPrefix ?? `acf-${reactId}`;
  const announceRef = useRef<HTMLDivElement>(null);

  const internal = useAcademicContextOptions({
    audience: props.audience,
    scope: props.scope,
    includeInactive: props.includeInactive,
    initialSelection: props.initialSelection,
    selection: props.controller ? undefined : props.selection,
    onSelectionChange: props.controller ? undefined : props.onSelectionChange,
    enabled: props.controller ? false : props.enabled !== false,
  });

  const ctrl = props.controller ?? internal;
  const {
    selection,
    setField,
    options,
    loading,
    refetching,
    error,
    permissionDenied,
    languageContractIncomplete,
  } = ctrl;

  const show = {
    academicYear: props.showAcademicYear ?? true,
    cycle: props.showCycle ?? true,
    level: props.showLevel ?? true,
    track: props.showTrack ?? true,
    teachingLanguage: props.showTeachingLanguage ?? true,
    subject: props.showSubject ?? true,
    offering: props.showOffering ?? true,
    reference: props.showReference ?? false,
    term: props.showTerm ?? false,
    class: props.showClass ?? false,
  };

  const required = new Set(props.requiredFields ?? []);
  const layout = props.layout ?? 'standard';
  const busy = loading || refetching;
  const levels = options?.levels ?? [];
  const tracks = options?.tracks ?? [];
  const languages = options?.teaching_languages ?? [];
  const subjects = options?.subjects ?? [];
  const offerings = options?.offerings ?? [];
  const references = options?.references ?? [];
  const terms = options?.terms ?? [];
  const classes = options?.classes ?? [];
  const years = options?.academic_years ?? [];
  const cycles = options?.cycles ?? [];

  const selectedLevel = levels.find((l) => String(l.id) === selection.levelId);
  const supportsTracks = selectedLevel?.supports_tracks === true;
  const showTrackField = show.track && (supportsTracks || tracks.length > 0);

  const hasLevelOrClass = Boolean(selection.levelId || selection.classId);
  const hasSubject = Boolean(selection.subjectId);
  const selectedOffering = offerings.find((o) => String(o.id) === selection.offeringId);
  const selectedReference = references.find((r) => String(r.id) === selection.referenceId);

  const derivedLanguageFromOffering = selectedOffering?.teaching_language ?? null;
  const derivedLanguageFromReference = selectedReference?.teaching_language ?? null;

  let languageMode: 'select' | 'derived' | 'prereq' | 'empty' | 'incomplete' = 'prereq';
  if (languageContractIncomplete) languageMode = 'incomplete';
  else if (!hasLevelOrClass || !hasSubject) languageMode = 'prereq';
  else if (languages.length > 1) languageMode = 'select';
  else if (languages.length === 1 || derivedLanguageFromOffering || derivedLanguageFromReference) {
    languageMode = 'derived';
  } else if (hasLevelOrClass && hasSubject) languageMode = 'empty';

  const canOpenOfferings = canManageTeachingOfferings(user);
  const canOpenReferences = canManageTeachingReferences(user);

  useEffect(() => {
    if (!announceRef.current) return;
    const parts: string[] = [];
    if (selection.levelId === '') parts.push(t('academicContext.a11y.levelCleared'));
    if (selection.subjectId === '') parts.push(t('academicContext.a11y.subjectCleared'));
    if (selection.offeringId === '') parts.push(t('academicContext.a11y.offeringCleared'));
    if (selection.termId === '') parts.push(t('academicContext.a11y.termCleared'));
    if (parts.length) announceRef.current.textContent = parts.join(' ');
  }, [
    selection.levelId,
    selection.subjectId,
    selection.offeringId,
    selection.termId,
    t,
  ]);

  if (permissionDenied) {
    return (
      <div className="academic-context-filters academic-context-filters--denied" role="status">
        {t('academicContext.permissionDenied')}
      </div>
    );
  }

  if (languageContractIncomplete || languageMode === 'incomplete') {
    return (
      <div
        className="academic-context-filters academic-context-filters--contract"
        role="alert"
      >
        {t('academicContext.language.contractIncomplete')}
      </div>
    );
  }

  const subjectDisabled = !hasLevelOrClass;
  const offeringDisabled = !selection.subjectId;
  const referenceDisabled = !selection.offeringId;
  const termDisabled = !selection.academicYearId;
  const trackDisabled = !selection.levelId;

  const subjectHint = subjectDisabled
    ? t('academicContext.hints.chooseLevelOrClassFirst')
    : subjects.length === 0 && hasLevelOrClass && !busy
      ? t('academicContext.hints.noSubjectsForLevel')
      : null;

  const languageHint =
    languageMode === 'prereq'
      ? t('academicContext.language.chooseLevelSubjectFirst')
      : languageMode === 'empty'
        ? t('academicContext.language.noneConfigured')
        : languageMode === 'derived'
          ? t('academicContext.language.derivedFromOffering', {
              language:
                formatLanguageOptionLabel(
                  derivedLanguageFromOffering ||
                    derivedLanguageFromReference ||
                    languages[0]!,
                ),
            })
          : null;

  const renderClass = () =>
    show.class ? (
      <FieldShell
        id={`${prefix}-class`}
        label={t('academicContext.fields.class')}
        required={required.has('class')}
      >
        <select
          id={`${prefix}-class`}
          className="select academic-context-filters__select"
          value={selection.classId}
          disabled={busy}
          onChange={(e) => setField('class', e.target.value)}
          aria-busy={busy}
        >
          <option value="">{t('academicContext.placeholders.class')}</option>
          {classes.map((cls) => {
            const label = formatClassContextLabel(cls);
            return (
              <option key={cls.id} value={cls.id} dir="auto">
                {label.secondary ? `${label.primary} (${label.secondary})` : label.primary}
              </option>
            );
          })}
        </select>
      </FieldShell>
    ) : null;

  const renderSubject = () =>
    show.subject ? (
      <FieldShell
        id={`${prefix}-subject`}
        label={t('academicContext.fields.subject')}
        required={required.has('subject')}
        hint={subjectHint}
      >
        <select
          id={`${prefix}-subject`}
          className="select academic-context-filters__select"
          value={selection.subjectId}
          disabled={busy || subjectDisabled}
          onChange={(e) => setField('subject', e.target.value)}
          aria-busy={busy}
          aria-describedby={subjectHint ? `${prefix}-subject-hint` : undefined}
        >
          <option value="">{t('academicContext.placeholders.subject')}</option>
          {subjects.map((subject) => {
            const label = formatEffectiveSubjectLabel(subject);
            const sourceKey = subject.source
              ? t(`academicContext.subjectSource.${subject.source}`)
              : '';
            const offeringCount =
              subject.offering_count != null && subject.offering_count > 1
                ? subject.offering_count
                : subject.ambiguous
                  ? 2
                  : 0;
            const ambiguity =
              offeringCount > 1
                ? t('academicContext.subjectAmbiguous', { count: String(offeringCount) })
                : '';
            const secondary = [
              subject.level?.display_alias || subject.level?.name,
              subject.track?.name,
              sourceKey,
              ambiguity,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <option key={subject.id} value={subject.id} dir="auto">
                {secondary ? `${label.primary} — ${secondary}` : label.primary}
              </option>
            );
          })}
        </select>
      </FieldShell>
    ) : null;

  return (
    <div
      className={[
        'academic-context-filters',
        layout === 'compact' ? 'academic-context-filters--compact' : '',
        props.className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-refetching={refetching ? 'true' : 'false'}
    >
      <div className="sr-only" aria-live="polite" ref={announceRef} />

      {error ? (
        <p className="academic-context-filters__error" role="alert">
          {t(`academicContext.errors.${error.code}`) !== `academicContext.errors.${error.code}`
            ? t(`academicContext.errors.${error.code}`)
            : error.message}
        </p>
      ) : null}

      {busy && !options ? (
        <p className="academic-context-filters__loading" role="status">
          {t('academicContext.loading')}
        </p>
      ) : null}

      <div className="academic-context-filters__grid">
        {show.academicYear ? (
          <FieldShell
            id={`${prefix}-year`}
            label={t('academicContext.fields.academicYear')}
            required={required.has('academicYear')}
          >
            <select
              id={`${prefix}-year`}
              className="select academic-context-filters__select"
              value={selection.academicYearId}
              disabled={busy}
              onChange={(e) => setField('academicYear', e.target.value)}
            >
              <option value="">{t('academicContext.placeholders.academicYear')}</option>
              {years.map((year) => (
                <option key={year.id} value={year.id} dir="auto">
                  {year.name}
                </option>
              ))}
            </select>
          </FieldShell>
        ) : null}

        {show.term ? (
          <FieldShell
            id={`${prefix}-term`}
            label={t('academicContext.fields.term')}
            required={required.has('term')}
            hint={termDisabled ? t('academicContext.hints.chooseYearFirst') : null}
          >
            <select
              id={`${prefix}-term`}
              className="select academic-context-filters__select"
              value={selection.termId}
              disabled={busy || termDisabled}
              onChange={(e) => setField('term', e.target.value)}
            >
              <option value="">{t('academicContext.placeholders.term')}</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id} dir="auto">
                  {formatTermOptionLabel(term)}
                </option>
              ))}
            </select>
          </FieldShell>
        ) : null}

        {show.cycle ? (
          <FieldShell
            id={`${prefix}-cycle`}
            label={t('academicContext.fields.cycle')}
            required={required.has('cycle')}
          >
            <select
              id={`${prefix}-cycle`}
              className="select academic-context-filters__select"
              value={selection.cycleId}
              disabled={busy}
              onChange={(e) => setField('cycle', e.target.value)}
            >
              <option value="">{t('academicContext.placeholders.cycle')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id} dir="auto">
                  {cycle.name}
                </option>
              ))}
            </select>
          </FieldShell>
        ) : null}

        {show.level ? (
          <FieldShell
            id={`${prefix}-level`}
            label={t('academicContext.fields.level')}
            required={required.has('level')}
            hint={!selection.cycleId && cycles.length ? t('academicContext.hints.chooseCycleFirst') : null}
          >
            <select
              id={`${prefix}-level`}
              className="select academic-context-filters__select"
              value={selection.levelId}
              disabled={busy}
              onChange={(e) => setField('level', e.target.value)}
            >
              <option value="">{t('academicContext.placeholders.level')}</option>
              {levels.map((level) => {
                const label = formatLevelContextLabel(level);
                return (
                  <option key={level.id} value={level.id} dir="auto">
                    {label.secondary ? `${label.primary} · ${label.secondary}` : label.primary}
                  </option>
                );
              })}
            </select>
          </FieldShell>
        ) : null}

        {showTrackField ? (
          <FieldShell
            id={`${prefix}-track`}
            label={t('academicContext.fields.track')}
            required={required.has('track')}
            hint={trackDisabled ? t('academicContext.hints.chooseLevelFirst') : null}
          >
            <select
              id={`${prefix}-track`}
              className="select academic-context-filters__select"
              value={selection.trackId}
              disabled={busy || trackDisabled}
              onChange={(e) => setField('track', e.target.value)}
            >
              <option value="">{t('academicContext.placeholders.track')}</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id} dir="auto">
                  {track.display_label || track.name}
                </option>
              ))}
            </select>
          </FieldShell>
        ) : null}

        {props.classBeforeSubject ? renderClass() : null}
        {renderSubject()}
        {!props.classBeforeSubject ? renderClass() : null}

        {show.teachingLanguage ? (
          <FieldShell
            id={`${prefix}-language`}
            label={t('academicContext.fields.teachingLanguage')}
            required={required.has('teachingLanguage')}
            hint={languageHint}
          >
            {languageMode === 'select' ? (
              <select
                id={`${prefix}-language`}
                className="select academic-context-filters__select"
                value={selection.teachingLanguageId}
                disabled={busy}
                onChange={(e) => setField('teachingLanguage', e.target.value)}
              >
                <option value="">{t('academicContext.placeholders.teachingLanguage')}</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.id} dir="auto">
                    {formatLanguageOptionLabel(lang)}
                  </option>
                ))}
              </select>
            ) : languageMode === 'derived' ? (
              <p
                id={`${prefix}-language`}
                className="academic-context-filters__readonly"
                dir="auto"
              >
                {formatLanguageOptionLabel(
                  derivedLanguageFromOffering ||
                    derivedLanguageFromReference ||
                    languages[0]!,
                )}
              </p>
            ) : languageMode === 'empty' ? (
              <div className="academic-context-filters__data-quality" role="status">
                <p>{t('academicContext.language.noneConfigured')}</p>
                <p className="academic-context-filters__hint">
                  {t('academicContext.language.completeOfferingOrReference')}
                </p>
                {(canOpenOfferings || canOpenReferences) && (
                  <div className="academic-context-filters__cta-row">
                    {canOpenOfferings ? (
                      <Link
                        href="/admin/teaching-planning/offerings"
                        className="btn btn--ghost btn--sm"
                      >
                        {t('academicContext.language.openOfferings')}
                      </Link>
                    ) : null}
                    {canOpenReferences ? (
                      <Link
                        href="/admin/teaching-planning/references"
                        className="btn btn--ghost btn--sm"
                      >
                        {t('academicContext.language.openReferences')}
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <p className="academic-context-filters__hint muted">
                {t('academicContext.language.chooseLevelSubjectFirst')}
              </p>
            )}
          </FieldShell>
        ) : null}

        {show.offering ? (
          <FieldShell
            id={`${prefix}-offering`}
            label={t('academicContext.fields.offering')}
            required={required.has('offering') || offerings.length > 1}
            hint={
              offeringDisabled
                ? t('academicContext.hints.chooseSubjectFirst')
                : offerings.length > 1
                  ? t('academicContext.hints.ambiguousOfferings')
                  : null
            }
          >
            <select
              id={`${prefix}-offering`}
              className="select academic-context-filters__select"
              value={selection.offeringId}
              disabled={busy || offeringDisabled}
              onChange={(e) => setField('offering', e.target.value)}
            >
              <option value="">
                {offerings.length > 1
                  ? t('academicContext.placeholders.offeringRequired')
                  : t('academicContext.placeholders.offering')}
              </option>
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id} dir="auto">
                  {formatOfferingContextLabel(offering)}
                </option>
              ))}
            </select>
          </FieldShell>
        ) : null}

        {show.reference ? (
          <FieldShell
            id={`${prefix}-reference`}
            label={t('academicContext.fields.reference')}
            required={required.has('reference')}
            hint={
              referenceDisabled
                ? t('academicContext.hints.chooseOfferingFirst')
                : null
            }
          >
            <select
              id={`${prefix}-reference`}
              className="select academic-context-filters__select"
              value={selection.referenceId}
              disabled={busy || referenceDisabled}
              onChange={(e) => setField('reference', e.target.value)}
            >
              <option value="">{t('academicContext.placeholders.reference')}</option>
              {references.map((reference) => {
                const label = formatReferenceContextLabel(reference);
                const incomplete = label.incomplete
                  ? ` — ${t('academicContext.reference.incomplete')}`
                  : '';
                return (
                  <option
                    key={reference.id}
                    value={reference.id}
                    dir="auto"
                    disabled={label.incomplete}
                  >
                    {label.secondary
                      ? `${label.primary} — ${label.secondary}${incomplete}`
                      : `${label.primary}${incomplete}`}
                  </option>
                );
              })}
            </select>
            {selectedReference && selectedReference.context_complete === false ? (
              <p className="academic-context-filters__warning" role="status">
                {t('academicContext.reference.incomplete')}
              </p>
            ) : null}
          </FieldShell>
        ) : null}
      </div>

      {refetching && options ? (
        <p className="academic-context-filters__refetch" role="status">
          {t('academicContext.refetching')}
        </p>
      ) : null}

      {options?.warnings?.length ? (
        <ul className="academic-context-filters__warnings">
          {options.warnings.map((w) => (
            <li key={w.code}>{w.message || t(`academicContext.warnings.${w.code}`)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
