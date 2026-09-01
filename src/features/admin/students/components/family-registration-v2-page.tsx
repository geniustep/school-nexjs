'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PermissionDeniedState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { canCreateStudents } from '@/lib/permissions/academic-capabilities';
import type { PersonSearchResult } from '@/types/student-360';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import type { BatchRegistrationResponse } from '@/types/student-batch-registration';
import { useStudentOptions } from '../hooks/use-student-options';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import {
  GUARDIAN_GLOBAL_SEARCH_MIN_QUERY,
  searchGuardiansGlobally,
} from '../utils/guardian-global-search';
import { resolvePersonSchoolParentId } from '../utils/student-create-guardian-payload';
import {
  fullRegistrationGuardianDisplayNames,
} from '../utils/full-registration-requested-adjustments';
import { fullRegistrationCopy } from '../utils/full-registration-copy';
import { FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS } from '../utils/full-registration-ui';
import {
  FAMILY_REGISTRATION_MAX_CHILDREN,
  applySharedDefaultsToChildren,
  emptyFamilyRegistrationSubmitState,
  type FamilyRegistrationSubmitState,
} from '../utils/family-registration-state';
import {
  validateFamilyRegistrationChildrenStep,
  validateFamilyRegistrationGuardiansStep,
} from '../utils/family-registration-payload';
import {
  familySubmitOutcomeSummary,
  runFamilyRegistrationSubmit,
  shouldOfferFamilyFailedRetry,
} from '../utils/family-registration-submit';
import { FamilyBatchIdempotencyRegistry } from '../utils/family-registration-idempotency';
import {
  buildFamilyRegistrationV2CanonicalForm,
  familyRegistrationV2SelectedGuardianKeys,
  familyRegistrationV2SubmissionBlockCode,
  type FamilyRegistrationV2ChildDraft,
  type FamilyRegistrationV2FamilyContext,
  type FamilyRegistrationV2GuardianKey,
  type FamilyRegistrationV2GuardianDraft,
} from '../utils/family-registration-v2-adapter';
import {
  resolveDefaultAcademicYearId,
  resolveDefaultNationalityId,
  todayIsoDate,
} from '../utils/student-profile';
import { mapStudentApiError } from '../utils/student-api-errors';
import {
  buildEnrollmentCycleOptions,
  filterLevelsByCycleId,
} from '../utils/student-enrollment-cycle';
import sourceStyles from './full-registration-page.module.css';
import styles from './family-registration-v2-page.module.css';

type GuardianKey = FamilyRegistrationV2GuardianKey;
type ChildDraft = FamilyRegistrationV2ChildDraft;

type FamilyRegistrationV2View = 'registration' | 'result';

const EXPERIMENT_COPY = {
  ar: {
    eyebrow: 'نسخة التسجيل العائلي الجديدة',
    title: 'تسجيل أسرة',
    lead: 'سجّل أولياء الأسرة وأبناءها في طلب واحد، مع إعادة آمنة للفاشلين فقط.',
    familyContext: 'وضع الأسرة',
    together: 'الأب والأم',
    separated: 'منفصلان / مطلقان',
    single: 'ولي واحد',
    singleGuardianKind: 'من هو الولي؟',
    guardians: 'أولياء الأمر',
    guardianName: 'اسم الولي',
    billingGuardian: 'مسؤول الأداء',
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
    cycle: 'السلك',
    level: 'المستوى',
    enrollmentDate: 'تاريخ الالتحاق',
    choose: 'اختر',
    currentVersion: 'النسخة الحالية',
    submit: 'اعتماد تسجيل الأسرة',
    submitting: 'جارٍ تسجيل الأسرة…',
    retryFailed: 'إعادة الفاشلين فقط',
    childCollapsedHint: 'اضغط لفتح بيانات التلميذ',
    separatedBlocked:
      'حالة المنفصلين/المطلقين تحتاج أولًا عقدًا صريحًا لحقوق الولي القانونية والاستلام؛ لن تُرسل بيانات ناقصة أو مفترضة.',
    existingGuardianRequired:
      'اختر وليًا مسجلًا في المدرسة. لا يمكن استخدام سجل شخص فقط في تسجيل الأسرة الجماعي.',
    validationError: 'راجع البيانات المطلوبة قبل اعتماد تسجيل الأسرة.',
    fullSuccess: 'تم تسجيل جميع الأبناء بنجاح.',
    partialSuccess: 'تم تسجيل بعض الأبناء. لن يُعاد إرسال الناجحين.',
    fullFailure: 'تعذر تسجيل الأسرة.',
    requested: 'المطلوب',
    succeeded: 'نجح',
    failed: 'تعذر',
    statusSucceeded: 'تم التسجيل',
    statusFailed: 'تعذر التسجيل',
    statusAmbiguous: 'النتيجة غير مؤكدة',
    statusBlocked: 'متوقف بعد فشل سابق',
    statusPending: 'بانتظار الإرسال',
    openStudent: 'فتح ملف التلميذ',
    backToEdit: 'العودة للتعديل',
    backToList: 'قائمة التلاميذ',
    unavailableExisting: 'ليس سجل ولي داخل المدرسة',
  },
  fr: {
    eyebrow: 'Nouvelle inscription familiale',
    title: 'Inscription d’une famille',
    lead: 'Inscrivez les responsables et plusieurs enfants en une seule requête, avec reprise sûre des échecs uniquement.',
    familyContext: 'Situation familiale',
    together: 'Père et mère',
    separated: 'Séparés / divorcés',
    single: 'Un seul responsable',
    singleGuardianKind: 'Quel responsable ?',
    guardians: 'Responsables',
    guardianName: 'Nom du responsable',
    billingGuardian: 'Responsable du paiement',
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
    cycle: 'Cycle',
    level: 'Niveau',
    enrollmentDate: "Date d'entrée",
    choose: 'Choisir',
    currentVersion: 'Version actuelle',
    submit: 'Valider l’inscription familiale',
    submitting: 'Inscription de la famille…',
    retryFailed: 'Réessayer les échecs uniquement',
    childCollapsedHint: 'Cliquez pour ouvrir les informations',
    separatedBlocked:
      'Le cas séparé/divorcé nécessite un contrat explicite pour les droits légaux et la récupération de l’élève. Aucune valeur ne sera supposée.',
    existingGuardianRequired:
      'Sélectionnez un responsable déjà enregistré dans l’école. Une simple fiche personne ne suffit pas pour le lot familial.',
    validationError: 'Vérifiez les champs requis avant de valider.',
    fullSuccess: 'Tous les élèves ont été inscrits.',
    partialSuccess: 'Certains élèves ont été inscrits. Les réussites ne seront pas renvoyées.',
    fullFailure: 'L’inscription familiale a échoué.',
    requested: 'Demandés',
    succeeded: 'Réussis',
    failed: 'Échecs',
    statusSucceeded: 'Inscrit',
    statusFailed: 'Échec',
    statusAmbiguous: 'Résultat incertain',
    statusBlocked: 'Bloqué après un échec',
    statusPending: 'En attente',
    openStudent: 'Ouvrir le dossier',
    backToEdit: 'Retour à la saisie',
    backToList: 'Liste des élèves',
    unavailableExisting: 'Pas encore un responsable de cette école',
  },
  en: {
    eyebrow: 'New family registration',
    title: 'Family registration',
    lead: 'Register guardians and multiple children in one request, with safe retry of failed children only.',
    familyContext: 'Family situation',
    together: 'Father and mother',
    separated: 'Separated / divorced',
    single: 'Single guardian',
    singleGuardianKind: 'Which guardian?',
    guardians: 'Guardians',
    guardianName: 'Guardian name',
    billingGuardian: 'Billing guardian',
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
    cycle: 'Cycle',
    level: 'Level',
    enrollmentDate: 'Joining date',
    choose: 'Choose',
    currentVersion: 'Current version',
    submit: 'Confirm family registration',
    submitting: 'Registering family…',
    retryFailed: 'Retry failed only',
    childCollapsedHint: 'Click to open student information',
    separatedBlocked:
      'Separated/divorced registration needs an explicit contract for legal and pickup rights first. No rights will be guessed or silently submitted.',
    existingGuardianRequired:
      'Select a guardian already registered in this school. A person-only record cannot be used in the family batch.',
    validationError: 'Review required fields before submitting.',
    fullSuccess: 'All students were registered successfully.',
    partialSuccess: 'Some students were registered. Successful students will not be submitted again.',
    fullFailure: 'Family registration failed.',
    requested: 'Requested',
    succeeded: 'Succeeded',
    failed: 'Failed',
    statusSucceeded: 'Registered',
    statusFailed: 'Failed',
    statusAmbiguous: 'Uncertain result',
    statusBlocked: 'Stopped after failure',
    statusPending: 'Pending',
    openStudent: 'Open student',
    backToEdit: 'Back to edit',
    backToList: 'Students list',
    unavailableExisting: 'Not a school guardian record',
  },
  es: {
    eyebrow: 'Nuevo registro familiar',
    title: 'Registro de familia',
    lead: 'Registra responsables y varios alumnos en una sola solicitud, reintentando de forma segura solo los fallidos.',
    familyContext: 'Situación familiar',
    together: 'Padre y madre',
    separated: 'Separados / divorciados',
    single: 'Un solo responsable',
    singleGuardianKind: '¿Qué responsable?',
    guardians: 'Responsables',
    guardianName: 'Nombre del responsable',
    billingGuardian: 'Responsable del pago',
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
    cycle: 'Ciclo',
    level: 'Nivel',
    enrollmentDate: 'Fecha de incorporación',
    choose: 'Elegir',
    currentVersion: 'Versión actual',
    submit: 'Confirmar registro familiar',
    submitting: 'Registrando familia…',
    retryFailed: 'Reintentar solo fallidos',
    childCollapsedHint: 'Pulsa para abrir la información',
    separatedBlocked:
      'El caso separado/divorciado necesita primero un contrato explícito de derechos legales y recogida. No se supondrán valores.',
    existingGuardianRequired:
      'Selecciona un responsable ya registrado en el centro. Una ficha de persona no basta para el lote familiar.',
    validationError: 'Revisa los campos obligatorios antes de enviar.',
    fullSuccess: 'Todos los alumnos fueron registrados.',
    partialSuccess: 'Algunos alumnos fueron registrados. Los correctos no se reenviarán.',
    fullFailure: 'Falló el registro familiar.',
    requested: 'Solicitados',
    succeeded: 'Correctos',
    failed: 'Fallidos',
    statusSucceeded: 'Registrado',
    statusFailed: 'Fallido',
    statusAmbiguous: 'Resultado incierto',
    statusBlocked: 'Bloqueado tras un fallo',
    statusPending: 'Pendiente',
    openStudent: 'Abrir alumno',
    backToEdit: 'Volver a editar',
    backToList: 'Lista de alumnos',
    unavailableExisting: 'No es un responsable del centro',
  },
} as const;

function emptyGuardian(key: GuardianKey): FamilyRegistrationV2GuardianDraft {
  return {
    key,
    mode: 'new',
    linkedGuardianId: null,
    name: '',
    alternateName: '',
    phone: '',
  };
}

let childSequence = 1;
function emptyChild(defaultYear = '', enrollmentDate = ''): ChildDraft {
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
    cycleId: '',
    levelId: '',
    enrollmentDate,
  };
}

function childDisplayName(child: ChildDraft): string {
  const ar = [child.firstNameAr, child.lastNameAr].filter(Boolean).join(' ').trim();
  const latin = [child.firstNameFr, child.lastNameFr].filter(Boolean).join(' ').trim();
  return ar || latin;
}

function guardianDraftReady(draft: FamilyRegistrationV2GuardianDraft): boolean {
  if (draft.mode === 'existing') {
    return typeof draft.linkedGuardianId === 'number' && draft.linkedGuardianId > 0;
  }
  return Boolean(draft.name.trim());
}

function GuardianCard({
  kind,
  draft,
  onChange,
  activeSchoolId,
}: {
  kind: GuardianKey;
  draft: FamilyRegistrationV2GuardianDraft;
  onChange: (next: FamilyRegistrationV2GuardianDraft) => void;
  activeSchoolId: number | null;
}) {
  const { locale } = useLocale();
  const toast = useToast();
  const localCopy = EXPERIMENT_COPY[locale] ?? EXPERIMENT_COPY.en;
  const copy = (key: string) => fullRegistrationCopy(locale, key);
  const [search, setSearch] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const debouncedSearch = useDebouncedValue(
    search,
    FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  );
  const suggestionQuery = draft.phone.trim().replace(/\D/g, '').length >= 8
    ? draft.phone.trim()
    : draft.name.trim().length >= 2
      ? draft.name.trim()
      : '';
  const debouncedSuggestion = useDebouncedValue(
    suggestionQuery,
    FULL_REGISTRATION_GUARDIAN_SEARCH_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (draft.linkedGuardianId) {
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
  }, [
    activeSchoolId,
    debouncedSearch,
    debouncedSuggestion,
    draft.linkedGuardianId,
    draft.mode,
  ]);

  function switchMode(mode: FamilyRegistrationV2GuardianDraft['mode']) {
    setSearch('');
    setResults([]);
    setPhoneDraft('');
    onChange({
      ...draft,
      mode,
      linkedGuardianId: null,
      name: '',
      alternateName: '',
      phone: '',
    });
  }

  function selectExisting(person: PersonSearchResult) {
    const guardianId = resolvePersonSchoolParentId(person);
    if (guardianId == null) return;
    const names = fullRegistrationGuardianDisplayNames(
      person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
    );
    const named = person as PersonSearchResult & {
      name_ar?: string | null;
      name_latin?: string | null;
    };
    onChange({
      ...draft,
      mode: 'existing',
      linkedGuardianId: guardianId,
      name: named.name_ar || names[0] || person.name || '',
      alternateName: named.name_latin || names[1] || '',
      phone: person.phone ?? '',
    });
    setPhoneDraft('');
    setSearch('');
    setResults([]);
  }

  async function saveExistingGuardianPhone() {
    if (!draft.linkedGuardianId || savingPhone) return;
    const phone = phoneDraft.trim();
    if (!phone) return;
    setSavingPhone(true);
    const result = await api.post<Record<string, unknown>>(
      endpoints.admin.parentUpdate(draft.linkedGuardianId),
      { phone },
    );
    setSavingPhone(false);
    if (!result.success) {
      toast.error(copy('phoneUpdateFailed'));
      return;
    }
    onChange({ ...draft, phone });
    setPhoneDraft('');
    toast.success(copy('phoneUpdated'));
  }

  const linked = draft.mode === 'existing' && Boolean(draft.linkedGuardianId);
  const title = kind === 'father' ? copy('father') : copy('mother');
  const cardClass = `${sourceStyles.guardianCard} ${
    kind === 'father' ? sourceStyles.guardianFather : sourceStyles.guardianMother
  }`;

  const searchResults = results.length ? (
    <div className={sourceStyles.searchResults}>
      {results.map((person) => {
        const names = fullRegistrationGuardianDisplayNames(
          person as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
        );
        const guardianId = resolvePersonSchoolParentId(person);
        return (
          <div
            className={sourceStyles.searchResult}
            key={`${person.partner_id}-${person.guardian_id ?? 'person'}`}
          >
            <div className={sourceStyles.searchMeta}>
              <strong className={sourceStyles.searchName}>{names[0] ?? person.name}</strong>
              {names[1] ? (
                <span className={sourceStyles.searchAltName} dir="auto">
                  {names[1]}
                </span>
              ) : null}
              {person.phone ? (
                <span className={sourceStyles.muted} dir="ltr">
                  {person.phone}
                </span>
              ) : null}
              {guardianId == null ? (
                <span className={sourceStyles.muted}>{localCopy.unavailableExisting}</span>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={guardianId == null}
              onClick={() => selectExisting(person)}
            >
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
            className={`${sourceStyles.modeButton} ${
              draft.mode === 'new' ? sourceStyles.modeButtonActive : ''
            }`}
            onClick={() => switchMode('new')}
          >
            {copy('newGuardian')}
          </button>
          <button
            type="button"
            aria-pressed={draft.mode === 'existing'}
            className={`${sourceStyles.modeButton} ${
              draft.mode === 'existing' ? sourceStyles.modeButtonActive : ''
            }`}
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
              <span className={sourceStyles.label}>{localCopy.guardianName}</span>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
              />
            </label>
            <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
              <span className={sourceStyles.label}>{copy('phone')}</span>
              <input
                className="input"
                dir="ltr"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => onChange({ ...draft, phone: e.target.value })}
              />
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
              <div className={sourceStyles.searchName}>{draft.name || '—'}</div>
              {draft.alternateName ? (
                <div className={sourceStyles.searchAltName}>{draft.alternateName}</div>
              ) : null}
              {draft.phone ? (
                <div className={sourceStyles.muted} dir="ltr">
                  {draft.phone}
                </div>
              ) : (
                <div className={sourceStyles.field}>
                  <span className={sourceStyles.label}>{copy('addPhone')}</span>
                  <div className={sourceStyles.guardianHead}>
                    <input
                      className="input"
                      dir="ltr"
                      inputMode="tel"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={savingPhone || !phoneDraft.trim()}
                      onClick={() => void saveExistingGuardianPhone()}
                    >
                      {copy('savePhone')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => switchMode('existing')}
            >
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
            placeholder={`${copy('search')} / ${copy('phone')}`}
            autoComplete="off"
          />
          {searching ? <span className={sourceStyles.muted}>{copy('searching')}</span> : null}
          {!searching &&
          debouncedSearch.trim().length >= GUARDIAN_GLOBAL_SEARCH_MIN_QUERY &&
          results.length === 0 ? (
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

  if (!canCreateStudents(user)) {
    return (
      <div className={sourceStyles.page} data-testid="family-registration-v2-denied">
        <PermissionDeniedState description={t('admin.pageForbidden')} />
      </div>
    );
  }

  return <FamilyRegistrationV2Allowed />;
}

function FamilyRegistrationV2Allowed() {
  const t = useT();
  const toast = useToast();
  const { locale } = useLocale();
  const copy = EXPERIMENT_COPY[locale] ?? EXPERIMENT_COPY.en;
  const { activeSchoolId } = useAdminSession();
  const optionsState = useStudentOptions();
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const today = useMemo(() => todayIsoDate(), []);
  const batchIdempotencyRef = useRef(new FamilyBatchIdempotencyRegistry());
  const submittingRef = useRef(false);

  const [view, setView] = useState<FamilyRegistrationV2View>('registration');
  const [familyContext, setFamilyContext] = useState<FamilyRegistrationV2FamilyContext>(
    'together',
  );
  const [singleGuardianKey, setSingleGuardianKey] = useState<GuardianKey>('father');
  const [billingGuardianKey, setBillingGuardianKey] = useState<GuardianKey>('father');
  const [guardians, setGuardians] = useState<Record<GuardianKey, FamilyRegistrationV2GuardianDraft>>({
    father: emptyGuardian('father'),
    mother: emptyGuardian('mother'),
  });
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild('', today)]);
  const [submitState, setSubmitState] = useState<FamilyRegistrationSubmitState>(() =>
    emptyFamilyRegistrationSubmitState(),
  );
  const [resolvedGuardianEntries, setResolvedGuardianEntries] = useState<
    StudentCreateGuardianEntry[] | null
  >(null);

  const defaultAcademicYearId = useMemo(
    () => resolveDefaultAcademicYearId(optionsState.options?.academicYears ?? []),
    [optionsState.options?.academicYears],
  );
  const defaultNationalityId = useMemo(
    () => resolveDefaultNationalityId(optionsState.options?.nationalities),
    [optionsState.options?.nationalities],
  );

  useEffect(() => {
    if (!defaultAcademicYearId) return;
    setChildren((prev) =>
      prev.map((child) =>
        child.academicYearId
          ? child
          : { ...child, academicYearId: defaultAcademicYearId },
      ),
    );
  }, [defaultAcademicYearId]);

  const resolvedSchoolId =
    typeof activeSchoolId === 'number' && activeSchoolId > 0 ? activeSchoolId : null;
  const levels = optionsState.options?.levels ?? [];
  const years = optionsState.options?.academicYears ?? [];
  const referenceLevels = levelOptionsState.options?.reference_levels ?? [];
  const levelCycles = levelOptionsState.options?.cycles ?? [];
  const enrollmentCycles = useMemo(
    () => buildEnrollmentCycleOptions(levels, referenceLevels, levelCycles),
    [levels, referenceLevels, levelCycles],
  );
  const selectedGuardianKeys = familyRegistrationV2SelectedGuardianKeys(
    familyContext,
    singleGuardianKey,
  );
  const outcome = familySubmitOutcomeSummary(submitState.results);
  const submitting = submitState.phase === 'submitting' || submittingRef.current;
  const retryFailedOnly =
    submitState.lockedAgainstFullResubmit && shouldOfferFamilyFailedRetry(submitState.results);

  useEffect(() => {
    if (!selectedGuardianKeys.includes(billingGuardianKey)) {
      setBillingGuardianKey(selectedGuardianKeys[0]);
    }
  }, [billingGuardianKey, selectedGuardianKeys]);

  function updateChild(localId: string, patch: Partial<ChildDraft>) {
    setChildren((prev) =>
      prev.map((child) => (child.localId === localId ? { ...child, ...patch } : child)),
    );
  }

  function setContext(next: FamilyRegistrationV2FamilyContext) {
    setFamilyContext(next);
    if (next === 'single') setBillingGuardianKey(singleGuardianKey);
    else if (!['father', 'mother'].includes(billingGuardianKey)) setBillingGuardianKey('father');
  }

  function setSingleGuardian(next: GuardianKey) {
    setSingleGuardianKey(next);
    if (familyContext === 'single') setBillingGuardianKey(next);
  }

  async function handleSubmit(options?: { retryFailedOnly?: boolean }) {
    if (submittingRef.current) return;
    if (submitState.lockedAgainstFullResubmit && !options?.retryFailedOnly) return;

    const blockCode = familyRegistrationV2SubmissionBlockCode(familyContext);
    if (blockCode) {
      toast.error(copy.separatedBlocked);
      return;
    }

    const missingGuardian = selectedGuardianKeys.find(
      (key) => !guardianDraftReady(guardians[key]),
    );
    if (missingGuardian) {
      toast.error(copy.validationError);
      return;
    }

    let canonical;
    try {
      canonical = buildFamilyRegistrationV2CanonicalForm({
        todayIso: today,
        familyContext,
        singleGuardianKey,
        billingGuardianKey,
        guardians,
        children,
        defaultNationalityId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'family_v2_existing_guardian_profile_required') {
        toast.error(copy.existingGuardianRequired);
      } else {
        toast.error(copy.validationError);
      }
      return;
    }

    const form = applySharedDefaultsToChildren(canonical);
    const guardiansCheck = validateFamilyRegistrationGuardiansStep(form, t);
    if (!guardiansCheck.valid) {
      toast.error(guardiansCheck.errors.message ?? copy.validationError);
      return;
    }
    const childrenCheck = validateFamilyRegistrationChildrenStep(form, t);
    if (!childrenCheck.valid) {
      toast.error(childrenCheck.errors.message ?? copy.validationError);
      return;
    }

    const onlyLocalIds = options?.retryFailedOnly
      ? submitState.results
          .filter((row) => row.status === 'failed' && row.canRetrySafely)
          .map((row) => row.localId)
      : undefined;

    submittingRef.current = true;
    setView('result');
    try {
      const final = await runFamilyRegistrationSubmit({
        form,
        schoolId: resolvedSchoolId,
        classes: optionsState.options?.classes ?? [],
        onlyLocalIds,
        priorResults: options?.retryFailedOnly ? submitState.results : undefined,
        resolvedGuardianEntries: resolvedGuardianEntries ?? undefined,
        idempotency: batchIdempotencyRef.current,
        postBatch: (payload) =>
          api.post<BatchRegistrationResponse>(endpoints.admin.studentsBatchRegistration, payload),
        mapErrorMessage: (error) =>
          error ? mapStudentApiError(error, t).message : copy.fullFailure,
        t,
        onProgress: (next) => setSubmitState(next),
      });
      setSubmitState(final);
      setResolvedGuardianEntries(final.resolvedGuardianEntries);

      const nextOutcome = familySubmitOutcomeSummary(final.results);
      if (nextOutcome.kind === 'full_success') toast.success(copy.fullSuccess);
      else if (nextOutcome.kind === 'partial_success') toast.error(copy.partialSuccess);
      else toast.error(copy.fullFailure);
    } finally {
      submittingRef.current = false;
    }
  }

  function renderRegistration() {
    return (
      <>
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
                className={`${styles.segmentedButton} ${
                  familyContext === value ? styles.segmentedButtonActive : ''
                }`}
                onClick={() => setContext(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {familyContext === 'single' ? (
            <div className={sourceStyles.field}>
              <span className={sourceStyles.label}>{copy.singleGuardianKind}</span>
              <div className={styles.segmented} role="group" aria-label={copy.singleGuardianKind}>
                {(['father', 'mother'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={singleGuardianKey === key}
                    className={`${styles.segmentedButton} ${
                      singleGuardianKey === key ? styles.segmentedButtonActive : ''
                    }`}
                    onClick={() => setSingleGuardian(key)}
                  >
                    {key === 'father' ? fullRegistrationCopy(locale, 'father') : fullRegistrationCopy(locale, 'mother')}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {familyContext === 'separated' ? (
            <div className={sourceStyles.linkedBox} role="status">
              <span className={sourceStyles.muted}>{copy.separatedBlocked}</span>
            </div>
          ) : null}
        </section>

        <section className={`${sourceStyles.section} ${styles.compactSection}`}>
          <div className={styles.sectionHead}>
            <h2>{copy.guardians}</h2>
          </div>
          <div className={styles.guardianGrid}>
            {selectedGuardianKeys.map((key) => (
              <GuardianCard
                key={key}
                kind={key}
                draft={guardians[key]}
                activeSchoolId={resolvedSchoolId}
                onChange={(next) => setGuardians((prev) => ({ ...prev, [key]: next }))}
              />
            ))}
          </div>
          <div className={sourceStyles.field}>
            <span className={sourceStyles.label}>{copy.billingGuardian}</span>
            <div className={styles.segmented} role="group" aria-label={copy.billingGuardian}>
              {selectedGuardianKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={billingGuardianKey === key}
                  className={`${styles.segmentedButton} ${
                    billingGuardianKey === key ? styles.segmentedButtonActive : ''
                  }`}
                  onClick={() => setBillingGuardianKey(key)}
                >
                  {key === 'father' ? fullRegistrationCopy(locale, 'father') : fullRegistrationCopy(locale, 'mother')}
                </button>
              ))}
            </div>
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
              disabled={children.length >= FAMILY_REGISTRATION_MAX_CHILDREN}
              onClick={() =>
                setChildren((prev) => [...prev, emptyChild(defaultAcademicYearId, today)])
              }
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
                    <span className={styles.chevron} aria-hidden="true">
                      ⌄
                    </span>
                  </summary>

                  <div className={styles.childBody}>
                    <div className={styles.childBlock}>
                      <h3>{copy.personal}</h3>
                      <div className={sourceStyles.grid}>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.firstNameAr}</span>
                          <input
                            className="input"
                            value={child.firstNameAr}
                            onChange={(e) =>
                              updateChild(child.localId, { firstNameAr: e.target.value })
                            }
                          />
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.lastNameAr}</span>
                          <input
                            className="input"
                            value={child.lastNameAr}
                            onChange={(e) =>
                              updateChild(child.localId, { lastNameAr: e.target.value })
                            }
                          />
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.firstNameFr}</span>
                          <input
                            className="input"
                            dir="ltr"
                            value={child.firstNameFr}
                            onChange={(e) =>
                              updateChild(child.localId, { firstNameFr: e.target.value })
                            }
                          />
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.lastNameFr}</span>
                          <input
                            className="input"
                            dir="ltr"
                            value={child.lastNameFr}
                            onChange={(e) =>
                              updateChild(child.localId, { lastNameFr: e.target.value })
                            }
                          />
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col4}`}>
                          <span className={sourceStyles.label}>{copy.gender}</span>
                          <select
                            className="input"
                            value={child.gender}
                            onChange={(e) => updateChild(child.localId, { gender: e.target.value })}
                          >
                            <option value="">{copy.choose}</option>
                            <option value="male">{copy.male}</option>
                            <option value="female">{copy.female}</option>
                          </select>
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col4}`}>
                          <span className={sourceStyles.label}>{copy.dob}</span>
                          <input
                            className="input"
                            type="date"
                            value={child.dateOfBirth}
                            onChange={(e) =>
                              updateChild(child.localId, { dateOfBirth: e.target.value })
                            }
                          />
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col4}`}>
                          <span className={sourceStyles.label}>{copy.previousSchool}</span>
                          <input
                            className="input"
                            value={child.previousSchool}
                            onChange={(e) =>
                              updateChild(child.localId, { previousSchool: e.target.value })
                            }
                          />
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col12}`}>
                          <span className={sourceStyles.label}>{copy.address}</span>
                          <input
                            className="input"
                            value={child.address}
                            onChange={(e) =>
                              updateChild(child.localId, { address: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className={styles.childBlock}>
                      <h3>{copy.academic}</h3>
                      <div className={sourceStyles.grid}>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.year}</span>
                          <select
                            className="input"
                            value={child.academicYearId}
                            onChange={(e) =>
                              updateChild(child.localId, {
                                academicYearId: e.target.value,
                                cycleId: '',
                                levelId: '',
                              })
                            }
                          >
                            <option value="">{copy.choose}</option>
                            {years.map((year) => (
                              <option key={year.id} value={String(year.id)}>
                                {year.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.cycle}</span>
                          <select
                            className="input"
                            value={child.cycleId}
                            onChange={(e) =>
                              updateChild(child.localId, { cycleId: e.target.value, levelId: '' })
                            }
                          >
                            <option value="">{copy.choose}</option>
                            {enrollmentCycles.map((cycle) => (
                              <option key={cycle.id} value={String(cycle.id)}>
                                {cycle.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.level}</span>
                          <select
                            className="input"
                            value={child.levelId}
                            onChange={(e) =>
                              updateChild(child.localId, { levelId: e.target.value })
                            }
                          >
                            <option value="">{copy.choose}</option>
                            {filterLevelsByCycleId(
                              levels.filter(
                                (level) =>
                                  !child.academicYearId ||
                                  level.academic_year_id == null ||
                                  String(level.academic_year_id) === child.academicYearId,
                              ),
                              child.cycleId,
                              referenceLevels,
                              levelCycles,
                            ).map((level) => (
                              <option key={level.id} value={String(level.id)}>
                                {level.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={`${sourceStyles.field} ${sourceStyles.col6}`}>
                          <span className={sourceStyles.label}>{copy.enrollmentDate}</span>
                          <input
                            className="input"
                            type="date"
                            value={child.enrollmentDate}
                            onChange={(e) =>
                              updateChild(child.localId, { enrollmentDate: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {children.length > 1 ? (
                      <div className={styles.childFooter}>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            setChildren((prev) =>
                              prev.filter((item) => item.localId !== child.localId),
                            )
                          }
                        >
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

        <div className={styles.previewBar}>
          <span>
            {familyContext === 'separated' ? copy.separatedBlocked : `${children.length} ${copy.children}`}
          </span>
          <div className={styles.previewActions}>
            <Link href="/admin/students/family/new" className="btn btn--ghost">
              {copy.currentVersion}
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting || familyContext === 'separated'}
              onClick={() => void handleSubmit(retryFailedOnly ? { retryFailedOnly: true } : undefined)}
            >
              {submitting ? copy.submitting : retryFailedOnly ? copy.retryFailed : copy.submit}
            </button>
          </div>
        </div>
      </>
    );
  }

  function statusLabel(status: string): string {
    if (status === 'succeeded') return copy.statusSucceeded;
    if (status === 'failed') return copy.statusFailed;
    if (status === 'ambiguous') return copy.statusAmbiguous;
    if (status === 'blocked') return copy.statusBlocked;
    return copy.statusPending;
  }

  function renderResult() {
    const failedCount = outcome.failed + outcome.ambiguous + outcome.blocked;
    const resultLead =
      outcome.kind === 'full_success'
        ? copy.fullSuccess
        : outcome.kind === 'partial_success'
          ? copy.partialSuccess
          : copy.fullFailure;

    return (
      <section className={`${sourceStyles.section} ${styles.childrenSection}`} data-testid="family-v2-result">
        <div className={styles.sectionHead}>
          <div>
            <h2>{copy.title}</h2>
            <span className={sourceStyles.muted}>{resultLead}</span>
          </div>
        </div>

        <div className={styles.segmented} role="status">
          <span className={styles.segmentedButton}>
            {copy.requested}: {submitState.results.length}
          </span>
          <span className={styles.segmentedButton}>
            {copy.succeeded}: {outcome.succeeded}
          </span>
          <span className={styles.segmentedButton}>
            {copy.failed}: {failedCount}
          </span>
        </div>

        <div className={styles.childList}>
          {submitState.results.map((result, index) => (
            <article key={result.localId} className={styles.childCard} data-status={result.status}>
              <div className={styles.childSummary}>
                <div className={styles.childIdentity}>
                  <span className={styles.childIndex}>{index + 1}</span>
                  <div>
                    <strong>{result.displayName}</strong>
                    <span>{statusLabel(result.status)}</span>
                  </div>
                </div>
                {result.studentId ? (
                  <Link
                    href={`/admin/students/${result.studentId}`}
                    className="btn btn--ghost btn--sm"
                  >
                    {copy.openStudent}
                  </Link>
                ) : null}
              </div>
              {result.errorMessage ? (
                <div className={sourceStyles.linkedBox} role="status">
                  <span className={sourceStyles.muted}>{result.errorMessage}</span>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className={styles.previewBar}>
          <span>{resultLead}</span>
          <div className={styles.previewActions}>
            {shouldOfferFamilyFailedRetry(submitState.results) ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting}
                onClick={() => void handleSubmit({ retryFailedOnly: true })}
              >
                {submitting ? copy.submitting : copy.retryFailed}
              </button>
            ) : null}
            {outcome.kind === 'full_failure' && !submitting ? (
              <button type="button" className="btn btn--secondary" onClick={() => setView('registration')}>
                {copy.backToEdit}
              </button>
            ) : null}
            <Link href="/admin/students" className="btn btn--ghost">
              {copy.backToList}
            </Link>
          </div>
        </div>
      </section>
    );
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

      {view === 'registration' ? renderRegistration() : renderResult()}
    </div>
  );
}
