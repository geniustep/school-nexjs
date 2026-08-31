'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PermissionDeniedState } from '@/components/states/states';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { canCreateStudents } from '@/lib/permissions/academic-capabilities';
import type { PersonSearchResult } from '@/types/student-360';
import { useStudentOptions } from '../hooks/use-student-options';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import {
  GUARDIAN_GLOBAL_SEARCH_MIN_QUERY,
  searchGuardiansGlobally,
} from '../utils/guardian-global-search';
import {
  resolvePersonPartnerId,
  resolvePersonSchoolParentId,
} from '../utils/student-create-guardian-payload';
import {
  buildFullRegistrationGuardianSuggestionQuery,
  fullRegistrationGuardianDisplayNames,
} from '../utils/full-registration-requested-adjustments';
import type { FullRegistrationGuardianDraft } from '../utils/full-registration-contract';
import { fullRegistrationCopy } from '../utils/full-registration-copy';
import { FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS } from '../utils/full-registration-ui';
import sourceStyles from './full-registration-page.module.css';
import styles from './family-registration-v2-page.module.css';

type GuardianKey = 'father' | 'mother';

type ChildDraft = {
  localId: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameFr: string;
  lastNameFr: string;
  gender: string;
  dateOfBirth: string;
  previousSchool: string;
  address: string;
  academicYearId: string;
  levelId: string;
};

const EXPERIMENT_COPY = {
  ar: {
    eyebrow: 'نسخة تجريبية جديدة',
    title: 'تسجيل أسرة',
    lead: 'نفس منطق وشكل تسجيل تلميذ واحد، مع وليي الأمر وعدة أبناء في صفحة قصيرة.',
    familyContext: 'وضع الأسرة',
    together: 'الأب والأم',
    separated: 'منفصلان / مطلقان',
    single: 'ولي واحد',
    guardians: 'أولياء الأمر',
    children: 'الأبناء',
    child: 'التلميذ',
    addChild: 'إضافة تلميذ',
    removeChild: 'حذف',
    personal: 'البيانات الأساسية',
    academic: 'التسجيل الدراسي',
    firstNameAr: 'الاسم الشخصي بالعربية',
    lastNameAr: 'الاسم العائلي بالعربية',
    firstNameFr: 'الاسم الشخصي باللاتينية',
    lastNameFr: 'الاسم العائلي باللاتينية',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    dob: 'تاريخ الميلاد',
    previousSchool: 'المؤسسة السابقة',
    address: 'العنوان',
    year: 'السنة الدراسية',
    level: 'المستوى',
    choose: 'اختر',
    currentVersion: 'النسخة الحالية',
    previewOnly: 'معاينة فقط — لا يتم إنشاء أي تلميذ أو ولي',
    submit: 'اعتماد تسجيل الأسرة',
    childCollapsedHint: 'اضغط لفتح بيانات التلميذ',
  },
  fr: {
    eyebrow: 'Nouvelle version expérimentale',
    title: 'Inscription d’une famille',
    lead: "La même structure que l’inscription d’un élève, adaptée aux parents et à plusieurs enfants.",
    familyContext: 'Situation familiale',
    together: 'Père et mère',
    separated: 'Séparés / divorcés',
    single: 'Un seul responsable',
    guardians: 'Responsables',
    children: 'Enfants',
    child: 'Élève',
    addChild: 'Ajouter un élève',
    removeChild: 'Supprimer',
    personal: 'Informations essentielles',
    academic: 'Inscription scolaire',
    firstNameAr: 'Prénom en arabe',
    lastNameAr: 'Nom en arabe',
    firstNameFr: 'Prénom en latin',
    lastNameFr: 'Nom en latin',
    gender: 'Sexe',
    male: 'Garçon',
    female: 'Fille',
    dob: 'Date de naissance',
    previousSchool: 'Établissement précédent',
    address: 'Adresse',
    year: 'Année scolaire',
    level: 'Niveau',
    choose: 'Choisir',
    currentVersion: 'Version actuelle',
    previewOnly: 'Aperçu uniquement — aucune donnée ne sera créée',
    submit: 'Valider l’inscription familiale',
    childCollapsedHint: 'Cliquez pour ouvrir les informations',
  },
  en: {
    eyebrow: 'New experimental version',
    title: 'Family registration',
    lead: 'The same structure as single-student registration, adapted to parents and multiple children.',
    familyContext: 'Family situation',
    together: 'Father and mother',
    separated: 'Separated / divorced',
    single: 'Single guardian',
    guardians: 'Guardians',
    children: 'Children',
    child: 'Student',
    addChild: 'Add student',
    removeChild: 'Remove',
    personal: 'Essential information',
    academic: 'Academic registration',
    firstNameAr: 'Arabic first name',
    lastNameAr: 'Arabic last name',
    firstNameFr: 'Latin first name',
    lastNameFr: 'Latin last name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    dob: 'Date of birth',
    previousSchool: 'Previous school',
    address: 'Address',
    year: 'Academic year',
    level: 'Level',
    choose: 'Choose',
    currentVersion: 'Current version',
    previewOnly: 'Preview only — no student or guardian will be created',
    submit: 'Confirm family registration',
    childCollapsedHint: 'Click to open student information',
  },
  es: {
    eyebrow: 'Nueva versión experimental',
    title: 'Registro de familia',
    lead: 'La misma estructura del registro individual, adaptada a responsables y varios alumnos.',
    familyContext: 'Situación familiar',
    together: 'Padre y madre',
    separated: 'Separados / divorciados',
    single: 'Un solo responsable',
    guardians: 'Responsables',
    children: 'Alumnos',
    child: 'Alumno',
    addChild: 'Añadir alumno',
    removeChild: 'Eliminar',
    personal: 'Información esencial',
    academic: 'Registro académico',
    firstNameAr: 'Nombre en árabe',
    lastNameAr: 'Apellido en árabe',
    firstNameFr: 'Nombre en latino',
    lastNameFr: 'Apellido en latino',
    gender: 'Sexo',
    male: 'Masculino',
    female: 'Femenino',
    dob: 'Fecha de nacimiento',
    previousSchool: 'Centro anterior',
    address: 'Dirección',
    year: 'Año académico',
    level: 'Nivel',
    choose: 'Elegir',
    currentVersion: 'Versión actual',
    previewOnly: 'Solo vista previa — no se crearán datos',
    submit: 'Confirmar registro familiar',
    childCollapsedHint: 'Pulsa para abrir la información',
  },
} as const;

function emptyGuardian(key: GuardianKey): FullRegistrationGuardianDraft {
  return {
    key,
    mode: 'new',
    relationshipType: key,
    linkedGuardianId: null,
    linkedPersonId: null,
    nameAr: '',
    nameFr: '',
    preferredLanguage: 'ar',
    phone: '',
    identity: '',
    legal: true,
    financial: key === 'father',
    pickup: true,
  };
}

let childSequence = 1;
function emptyChild(defaultYear = ''): ChildDraft {
  const id = `family-v2-child-${childSequence++}`;
  return {
    localId: id,
    firstNameAr: '',
    lastNameAr: '',
    firstNameFr: '',
    lastNameFr: '',
    gender: '',
    dateOfBirth: '',
    previousSchool: '',
    address: '',
    academicYearId: defaultYear,
    levelId: '',
  };
}

function childDisplayName(child: ChildDraft): string {
  const ar = [child.firstNameAr, child.lastNameAr].filter(Boolean).join(' ').trim();
  const latin = [child.firstNameFr, child.lastNameFr].filter(Boolean).join(' ').trim();
  return ar || latin;
}

function GuardianCard({
  kind,
  draft,
  onChange,
  activeSchoolId,
}: {
  kind: GuardianKey;
  draft: FullRegistrationGuardianDraft;
  onChange: (next: FullRegistrationGuardianDraft) => void;
  activeSchoolId: number | null;
}) {
  const { locale } = useLocale();
  const copy = (key: string) => fullRegistrationCopy(locale, key);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const debouncedSearch = useDebouncedValue(search, FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS);
  const suggestionQuery = buildFullRegistrationGuardianSuggestionQuery(draft);
  const debouncedSuggestion = useDebouncedValue(
    suggestionQuery,
    FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (draft.linkedGuardianId || draft.linkedPersonId) {
      setResults([]);
      setSearching(false);
      return;
    }
    const query = (draft.mode === 'existing' ? debouncedSearch : debouncedSuggestion).trim();
    if (query.length < GUARDIAN_GLOBAL_SEARCH_MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    searchGuardiansGlobally({ query, activeSchoolId, limit: 5 })
      .then((items) => {
        if (active) setResults(items);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [activeSchoolId, debouncedSearch, debouncedSuggestion, draft.linkedGuardianId, draft.linkedPersonId, draft.mode]);

  function switchMode(mode: FullRegistrationGuardianDraft['mode']) {
    setSearch('');
    setResults([]);
    onChange({
      ...draft,
      mode,
      linkedGuardianId: null,
      linkedPersonId: null,
      nameAr: '',
      nameFr: '',
      phone: '',
      identity: '',
    });
  }

  function selectExisting(person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    const personId = resolvePersonPartnerId(person);
    const names = fullRegistrationGuardianDisplayNames(
      person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
    );
    const named = person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null };
    onChange({
      ...draft,
      mode: 'existing',
      linkedGuardianId: guardianId,
      linkedPersonId: guardianId ? null : personId,
      nameAr: named.name_ar || names[0] || person.name || '',
      nameFr: named.name_latin || names[1] || '',
      phone: person.phone ?? '',
    });
    setSearch('');
    setResults([]);
  }

  const linked = draft.mode === 'existing' && Boolean(draft.linkedGuardianId || draft.linkedPersonId);
  const title = kind === 'father' ? copy('father') : copy('mother');
  const cardClass = `${sourceStyles.guardianCard} ${kind === 'father' ? sourceStyles.guardianFather : sourceStyles.guardianMother}`;

  const searchResults = results.length ? (
    <div className={sourceStyles.searchResults}>
      {results.map((person) => {
        const names = fullRegistrationGuardianDisplayNames(
          person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
        );
        return (
          <div className={sourceStyles.searchResult} key={`${person.partner_id}-${person.guardian_id ?? 'person'}`}>
            <div className={sourceStyles.searchMeta}>
              <strong className={sourceStyles.searchName}>{names[0] ?? person.name}</strong>
              {names[1] ? <span className={sourceStyles.searchAltName} dir="auto">{names[1]}</span> : null}
              {person.phone ? <span className={sourceStyles.muted} dir="ltr">{person.phone}</span> : null}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => selectExisting(person)}>
              {copy('useGuardian')}
            </button>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <article className={cardClass} data-testid={`family-v2-${kind}`}>
      <div className={sourceStyles.guardianHead}>
        <h3 className={sourceStyles.guardianTitle}>{title}</h3>
        <div className={sourceStyles.modeSwitch} role="group" aria-label={title}>
          <button
            type="button"
            aria-pressed={draft.mode === 'new'}
            className={`${sourceStyles.modeButton} ${draft.mode === 'new' ? sourceStyles.modeButtonActive : ''}`}
            onClick={() => switchMode('new')}
          >
            {copy('newGuardian')}
          </button>
          <button
            type="button"
            aria-pressed={draft.mode === 'existing'}
            className={`${sourceStyles.modeButton} ${draft.mode === 'existing' ? sourceStyles.modeButtonActive : ''}`}
            onClick={() => switchMode('existing')}
          >
            {copy('existingGuardian')}
          </button>
        </div>
      </div>

      {draft.mode === 'new' ? (
        <>
          <div className={sourceStyles.grid}>
            <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
              <span className={sourceStyles.label}>{copy('nameAr')}</span>
              <input className="input" value={draft.nameAr} onChange={(e) => onChange({ ...draft, nameAr: e.target.value })} />
            </label>
            <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
              <span className={sourceStyles.label}>{copy('nameFr')}</span>
              <input className="input" dir="ltr" value={draft.nameFr} onChange={(e) => onChange({ ...draft, nameFr: e.target.value })} />
            </label>
            <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
              <span className={sourceStyles.label}>{copy('phone')}</span>
              <input className="input" dir="ltr" inputMode="tel" value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} />
            </label>
            <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
              <span className={sourceStyles.label}>{copy('identity')}</span>
              <input className="input" dir="auto" value={draft.identity} onChange={(e) => onChange({ ...draft, identity: e.target.value })} />
            </label>
          </div>
          {searchResults ? (
            <div className={sourceStyles.linkedBox}>
              <span className={sourceStyles.muted}>{copy('guardianDuplicate')}</span>
              {searchResults}
            </div>
          ) : null}
        </>
      ) : linked ? (
        <div className={sourceStyles.linkedBox}>
          <div className={sourceStyles.guardianHead}>
            <div>
              <span className={sourceStyles.badge}>✓ {copy('linked')}</span>
              <div className={sourceStyles.searchName}>{draft.nameAr || draft.nameFr || '—'}</div>
              {draft.nameAr && draft.nameFr ? <div className={sourceStyles.searchAltName}>{draft.nameFr}</div> : null}
              {draft.phone ? <div className={sourceStyles.muted} dir="ltr">{draft.phone}</div> : null}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => switchMode('existing')}>
              {copy('change')}
            </button>
          </div>
        </div>
      ) : (
        <div className={sourceStyles.field}>
          <span className={sourceStyles.label}>{copy('search')}</span>
          <input
            type="search"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${copy('search')} / ${copy('identity')}`}
            autoComplete="off"
          />
          {searching ? <span className={sourceStyles.muted}>{copy('searching')}</span> : null}
          {!searching && debouncedSearch.trim().length >= GUARDIAN_GLOBAL_SEARCH_MIN_QUERY && results.length === 0 ? (
            <span className={sourceStyles.muted}>{copy('noMatches')}</span>
          ) : null}
          {searchResults}
        </div>
      )}
    </article>
  );
}

export function FamilyRegistrationV2Page() {
  const user = useSession();
  const t = useT();
  const { locale } = useLocale();
  const copy = EXPERIMENT_COPY[locale] ?? EXPERIMENT_COPY.en;
  const { activeSchoolId } = useAdminSession();
  const optionsState = useStudentOptions();
  const [familyContext, setFamilyContext] = useState<'together' | 'separated' | 'single'>('together');
  const [guardians, setGuardians] = useState<Record<GuardianKey, FullRegistrationGuardianDraft>>({
    father: emptyGuardian('father'),
    mother: emptyGuardian('mother'),
  });
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild()]);

  const defaultAcademicYearId = useMemo(() => {
    const years = optionsState.options?.academicYears ?? [];
    const current = years.find((year) => year.is_current) ?? years[0];
    return current ? String(current.id) : '';
  }, [optionsState.options?.academicYears]);

  useEffect(() => {
    if (!defaultAcademicYearId) return;
    setChildren((prev) => prev.map((child) => child.academicYearId ? child : { ...child, academicYearId: defaultAcademicYearId }));
  }, [defaultAcademicYearId]);

  if (!canCreateStudents(user)) {
    return (
      <div className={sourceStyles.page}>
        <PermissionDeniedState description={t('admin.pageForbidden')} />
      </div>
    );
  }

  const resolvedSchoolId = typeof activeSchoolId === 'number' && activeSchoolId > 0 ? activeSchoolId : null;
  const levels = optionsState.options?.levels ?? [];
  const years = optionsState.options?.academicYears ?? [];

  function updateChild(localId: string, patch: Partial<ChildDraft>) {
    setChildren((prev) => prev.map((child) => child.localId === localId ? { ...child, ...patch } : child));
  }

  return (
    <div className={`${sourceStyles.page} ${styles.page}`} data-testid="family-registration-v2">
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1 className={sourceStyles.title}>{copy.title}</h1>
          <p className={styles.heroLead}>{copy.lead}</p>
        </div>
        <Link href="/admin/students/family/new" className="btn btn--ghost btn--sm">
          {copy.currentVersion}
        </Link>
      </header>

      <section className={`${sourceStyles.section} ${styles.compactSection}`}>
        <div className={styles.sectionHead}>
          <h2>{copy.familyContext}</h2>
        </div>
        <div className={styles.segmented} role="group" aria-label={copy.familyContext}>
          {([
            ['together', copy.together],
            ['separated', copy.separated],
            ['single', copy.single],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={familyContext === value}
              className={`${styles.segmentedButton} ${familyContext === value ? styles.segmentedButtonActive : ''}`}
              onClick={() => setFamilyContext(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className={`${sourceStyles.section} ${styles.compactSection}`}>
        <div className={styles.sectionHead}>
          <h2>{copy.guardians}</h2>
        </div>
        <div className={styles.guardianGrid}>
          <GuardianCard
            kind="father"
            draft={guardians.father}
            activeSchoolId={resolvedSchoolId}
            onChange={(next) => setGuardians((prev) => ({ ...prev, father: next }))}
          />
          {familyContext !== 'single' ? (
            <GuardianCard
              kind="mother"
              draft={guardians.mother}
              activeSchoolId={resolvedSchoolId}
              onChange={(next) => setGuardians((prev) => ({ ...prev, mother: next }))}
            />
          ) : null}
        </div>
      </section>

      <section className={`${sourceStyles.section} ${styles.childrenSection}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2>{copy.children}</h2>
            <span className={styles.countBadge}>{children.length}</span>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={children.length >= 10}
            onClick={() => setChildren((prev) => [...prev, emptyChild(defaultAcademicYearId)])}
          >
            + {copy.addChild}
          </button>
        </div>

        <div className={styles.childList}>
          {children.map((child, index) => {
            const name = childDisplayName(child);
            const selectedLevel = levels.find((level) => String(level.id) === child.levelId);
            return (
              <details key={child.localId} className={styles.childCard} open={index === 0}>
                <summary className={styles.childSummary}>
                  <div className={styles.childIdentity}>
                    <span className={styles.childIndex}>{index + 1}</span>
                    <div>
                      <strong>{name || `${copy.child} ${index + 1}`}</strong>
                      <span>{selectedLevel?.name || copy.childCollapsedHint}</span>
                    </div>
                  </div>
                  <span className={styles.chevron} aria-hidden="true">⌄</span>
                </summary>

                <div className={styles.childBody}>
                  <div className={styles.childBlock}>
                    <h3>{copy.personal}</h3>
                    <div className={sourceStyles.grid}>
                      <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                        <span className={sourceStyles.label}>{copy.firstNameAr}</span>
                        <input className="input" value={child.firstNameAr} onChange={(e) => updateChild(child.localId, { firstNameAr: e.target.value })} />
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                        <span className={sourceStyles.label}>{copy.lastNameAr}</span>
                        <input className="input" value={child.lastNameAr} onChange={(e) => updateChild(child.localId, { lastNameAr: e.target.value })} />
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                        <span className={sourceStyles.label}>{copy.firstNameFr}</span>
                        <input className="input" dir="ltr" value={child.firstNameFr} onChange={(e) => updateChild(child.localId, { firstNameFr: e.target.value })} />
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                        <span className={sourceStyles.label}>{copy.lastNameFr}</span>
                        <input className="input" dir="ltr" value={child.lastNameFr} onChange={(e) => updateChild(child.localId, { lastNameFr: e.target.value })} />
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col4}`}>
                        <span className={sourceStyles.label}>{copy.gender}</span>
                        <select className="input" value={child.gender} onChange={(e) => updateChild(child.localId, { gender: e.target.value })}>
                          <option value="">{copy.choose}</option>
                          <option value="male">{copy.male}</option>
                          <option value="female">{copy.female}</option>
                        </select>
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col4}`}>
                        <span className={sourceStyles.label}>{copy.dob}</span>
                        <input className="input" type="date" value={child.dateOfBirth} onChange={(e) => updateChild(child.localId, { dateOfBirth: e.target.value })} />
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col4}`}>
                        <span className={sourceStyles.label}>{copy.previousSchool}</span>
                        <input className="input" value={child.previousSchool} onChange={(e) => updateChild(child.localId, { previousSchool: e.target.value })} />
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col12}`}>
                        <span className={sourceStyles.label}>{copy.address}</span>
                        <input className="input" value={child.address} onChange={(e) => updateChild(child.localId, { address: e.target.value })} />
                      </label>
                    </div>
                  </div>

                  <div className={styles.childBlock}>
                    <h3>{copy.academic}</h3>
                    <div className={sourceStyles.grid}>
                      <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                        <span className={sourceStyles.label}>{copy.year}</span>
                        <select className="input" value={child.academicYearId} onChange={(e) => updateChild(child.localId, { academicYearId: e.target.value, levelId: '' })}>
                          <option value="">{copy.choose}</option>
                          {years.map((year) => <option key={year.id} value={String(year.id)}>{year.name}</option>)}
                        </select>
                      </label>
                      <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                        <span className={sourceStyles.label}>{copy.level}</span>
                        <select className="input" value={child.levelId} onChange={(e) => updateChild(child.localId, { levelId: e.target.value })}>
                          <option value="">{copy.choose}</option>
                          {levels
                            .filter((level) => !child.academicYearId || level.academic_year_id == null || String(level.academic_year_id) === child.academicYearId)
                            .map((level) => <option key={level.id} value={String(level.id)}>{level.name}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  {children.length > 1 ? (
                    <div className={styles.childFooter}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setChildren((prev) => prev.filter((item) => item.localId !== child.localId))}>
                        {copy.removeChild}
                      </button>
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <div className={styles.previewBar} role="note">
        <span>{copy.previewOnly}</span>
        <div className={styles.previewActions}>
          <Link href="/admin/students/family/new" className="btn btn--ghost">
            {copy.currentVersion}
          </Link>
          <button type="button" className="btn btn--primary" disabled title={copy.previewOnly}>
            {copy.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
