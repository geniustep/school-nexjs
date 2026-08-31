'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { fetchAdmissionPrefill } from '@/features/admin/admissions/api/admissions-api';
import type { AdmissionPrefill } from '@/types/admission';
import type { PersonSearchResult } from '@/types/student-360';
import { fullRegistrationGuardianDisplayNames } from '../utils/full-registration-requested-adjustments';
import {
  extractAdmissionGuardianLookupSnapshot,
  parseAdmissionGuardianResolution,
  resolutionMatchesCandidate,
  resolveAdmissionGuardianBeforeRegistration,
  serializeAdmissionGuardianResolution,
  type AdmissionGuardianResolution,
  type AdmissionGuardianResolutionResult,
} from '../utils/admission-guardian-pre-resolution';
import { parseFullRegistrationAdmissionId } from '../utils/full-registration-admission-prefill';
import { FullRegistrationPage } from './full-registration-page';
import styles from './full-registration-page.module.css';

const COPY = {
  ar: {
    title: 'مطابقة ولي الأمر',
    lead: 'يتحقق رقيم من بيانات ولي الأمر في طلب القبول قبل إنشاء سجل جديد.',
    requestData: 'بيانات طلب القبول',
    checking: 'جارٍ التحقق من ولي الأمر الموجود…',
    matches: 'وجدنا أكثر من سجل مطابق. اختر الولي الصحيح قبل متابعة التسجيل.',
    use: 'استخدام هذا الولي',
    createNew: 'إنشاء ولي جديد بهذه البيانات',
    phone: 'الهاتف',
    identity: 'رقم الهوية',
    failed: 'تعذر التحقق من بيانات ولي الأمر. أعد المحاولة.',
    retry: 'إعادة المحاولة',
  },
  fr: {
    title: 'Correspondance du responsable',
    lead: 'Raqeem vérifie le responsable de la demande avant de créer une nouvelle fiche.',
    requestData: 'Données de la demande',
    checking: 'Vérification du responsable existant…',
    matches: 'Plusieurs fiches correspondent. Choisissez le bon responsable avant de continuer.',
    use: 'Utiliser ce responsable',
    createNew: 'Créer un nouveau responsable avec ces données',
    phone: 'Téléphone',
    identity: "Numéro d’identité",
    failed: 'Impossible de vérifier le responsable. Réessayez.',
    retry: 'Réessayer',
  },
  en: {
    title: 'Match guardian',
    lead: 'Raqeem checks the admission guardian before creating a new record.',
    requestData: 'Admission data',
    checking: 'Checking for an existing guardian…',
    matches: 'More than one record matches. Choose the correct guardian before continuing.',
    use: 'Use this guardian',
    createNew: 'Create a new guardian with these details',
    phone: 'Phone',
    identity: 'Identity number',
    failed: 'Could not verify the guardian. Try again.',
    retry: 'Retry',
  },
  es: {
    title: 'Coincidencia del responsable',
    lead: 'Raqeem comprueba el responsable de la solicitud antes de crear un registro nuevo.',
    requestData: 'Datos de la solicitud',
    checking: 'Buscando un responsable existente…',
    matches: 'Hay más de una coincidencia. Elige al responsable correcto antes de continuar.',
    use: 'Usar este responsable',
    createNew: 'Crear un responsable nuevo con estos datos',
    phone: 'Teléfono',
    identity: 'Número de identidad',
    failed: 'No se pudo verificar al responsable. Inténtalo de nuevo.',
    retry: 'Reintentar',
  },
} as const;

function updateResolutionQuery(resolution: AdmissionGuardianResolution) {
  const url = new URL(window.location.href);
  url.searchParams.set('guardian_resolution', serializeAdmissionGuardianResolution(resolution));
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function candidateResolution(candidate: PersonSearchResult): AdmissionGuardianResolution {
  if (candidate.guardian_id && candidate.guardian_id > 0) {
    return { kind: 'guardian', id: candidate.guardian_id };
  }
  return { kind: 'person', id: candidate.person_id ?? candidate.partner_id };
}

export function FullRegistrationAdmissionGate() {
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const { activeSchoolId } = useAdminSession();
  const [initialized, setInitialized] = useState(false);
  const [admissionId, setAdmissionId] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<AdmissionPrefill | null>(null);
  const [resolutionResult, setResolutionResult] = useState<AdmissionGuardianResolutionResult | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<AdmissionGuardianResolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAdmissionId(parseFullRegistrationAdmissionId(params.get('admission_id')));
    setSelectedResolution(parseAdmissionGuardianResolution(params.get('guardian_resolution')));
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || admissionId == null || activeSchoolId == null) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    setResolutionResult(null);

    fetchAdmissionPrefill(admissionId, { active_school_id: activeSchoolId })
      .then(async (res) => {
        if (!active) return;
        if (!res.success || !res.data) {
          setFailed(true);
          return;
        }
        setPrefill(res.data);
        const result = await resolveAdmissionGuardianBeforeRegistration({
          prefill: res.data,
          activeSchoolId,
          limit: 10,
        });
        if (!active) return;
        setResolutionResult(result);

        if (result.status === 'already_bound') return;

        if (result.status === 'unique' && result.resolution) {
          updateResolutionQuery(result.resolution);
          setSelectedResolution(result.resolution);
          return;
        }

        if (result.status === 'none') {
          const resolution: AdmissionGuardianResolution = { kind: 'new' };
          updateResolutionQuery(resolution);
          setSelectedResolution(resolution);
          return;
        }

        if (
          result.status === 'ambiguous' &&
          selectedResolution &&
          selectedResolution.kind !== 'new' &&
          result.candidates.some((candidate) => resolutionMatchesCandidate(selectedResolution, candidate))
        ) {
          return;
        }

        if (result.status !== 'ambiguous') setSelectedResolution(null);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSchoolId, admissionId, attempt, initialized]);

  const snapshot = useMemo(
    () => (prefill ? extractAdmissionGuardianLookupSnapshot(prefill) : null),
    [prefill],
  );

  if (!initialized) return null;
  if (admissionId == null) return <FullRegistrationPage />;

  const resolvedExisting =
    resolutionResult?.status === 'already_bound' ||
    resolutionResult?.status === 'unique' ||
    (resolutionResult?.status === 'ambiguous' &&
      selectedResolution != null &&
      selectedResolution.kind !== 'new' &&
      resolutionResult.candidates.some((candidate) =>
        resolutionMatchesCandidate(selectedResolution, candidate),
      ));
  const resolvedNew =
    resolutionResult?.status === 'none' ||
    (resolutionResult?.status === 'ambiguous' && selectedResolution?.kind === 'new');

  if (!loading && !failed && resolutionResult && (resolvedExisting || resolvedNew)) {
    return <FullRegistrationPage />;
  }

  return (
    <div className={styles.page}>
      <section className={styles.section} aria-live="polite">
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.sectionLead}>{copy.lead}</p>

        {snapshot ? (
          <div className={styles.summary}>
            <strong>{copy.requestData}</strong>
            {snapshot.name ? <span dir="auto">{snapshot.name}</span> : null}
            {snapshot.phone ? <span dir="ltr">{copy.phone}: {snapshot.phone}</span> : null}
            {snapshot.identity ? <span dir="ltr">{copy.identity}: {snapshot.identity}</span> : null}
          </div>
        ) : null}

        {loading ? <p className={styles.muted}>{copy.checking}</p> : null}

        {failed ? (
          <div className={styles.error} role="alert">
            {copy.failed}{' '}
            <button type="button" className="btn btn--ghost" onClick={() => setAttempt((value) => value + 1)}>
              {copy.retry}
            </button>
          </div>
        ) : null}

        {!loading && !failed && resolutionResult?.status === 'ambiguous' ? (
          <>
            <p className={styles.sectionLead}>{copy.matches}</p>
            <div className={styles.searchResults}>
              {resolutionResult.candidates.map((candidate) => {
                const names = fullRegistrationGuardianDisplayNames(
                  candidate as PersonSearchResult & { name_ar?: string | null; name_latin?: string | null },
                );
                const resolution = candidateResolution(candidate);
                return (
                  <div className={styles.searchResult} key={candidate.partner_id}>
                    <div className={styles.searchMeta}>
                      <strong className={styles.searchName}>{names[0] ?? candidate.name}</strong>
                      {names[1] ? <span className={styles.searchAltName} dir="auto">{names[1]}</span> : null}
                      {candidate.phone ? <span className={styles.muted} dir="ltr">{candidate.phone}</span> : null}
                      {candidate.identity_document_number_masked || candidate.national_id_masked ? (
                        <span className={styles.muted} dir="ltr">
                          {candidate.identity_document_number_masked ?? candidate.national_id_masked}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => {
                        updateResolutionQuery(resolution);
                        setSelectedResolution(resolution);
                      }}
                    >
                      {copy.use}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  const resolution: AdmissionGuardianResolution = { kind: 'new' };
                  updateResolutionQuery(resolution);
                  setSelectedResolution(resolution);
                }}
              >
                {copy.createNew}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
