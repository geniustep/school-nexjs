'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PersonSearchResult, RelationshipType } from '@/types/student-360';
import { useStudentOptions } from '../hooks/use-student-options';
import { buildEnrollmentCycleOptions, filterLevelsByCycleId } from '../utils/student-enrollment-cycle';
import { normalizePersonSearchList } from '../utils/normalize-person-search';
import { moroccanPhoneSearchQuery, normalizeMoroccanPhone, validateMoroccanPhone } from '../utils/normalize-moroccan-phone';
import { RELATIONSHIP_TYPE_CODES, relationshipTypeLabel } from '../utils/relationship-types';
import {
  buildStudentQuickCreatePayload,
  buildStudentQuickCreateSuccessHref,
  type StudentQuickCreateBillingInput,
  validateStudentQuickCreateInput,
} from '../utils/student-quick-create';

type Payer = 'guardian' | 'student';
type GuardianMode = 'existing' | 'new';
type GuardianBilling = Extract<StudentQuickCreateBillingInput, { mode: 'guardian' }>['guardian'];

const GENDER_COPY = {
  ar: ['الجنس', 'اختر الجنس.', 'ذكر', 'أنثى'],
  en: ['Gender', 'Select a gender.', 'Male', 'Female'],
  fr: ['Sexe', 'Choisissez le sexe.', 'Garçon', 'Fille'],
  es: ['Sexo', 'Seleccione el sexo.', 'Masculino', 'Femenino'],
} as const;
const BILLING_COPY = {
  ar: { payer: 'المسؤول عن الأداء', guardian: 'ولي الأمر', student: 'التلميذ', existing: 'ولي أمر موجود', fresh: 'ولي أمر جديد', search: 'البحث عن ولي موجود', searchPh: 'الاسم أو رقم الهاتف', searchAction: 'بحث', noResults: 'لم نجد شخصًا متاحًا للربط.', choose: 'اختر ولي الأمر', name: 'اسم ولي الأمر', phone: 'الهاتف', relation: 'صلة القرابة', relationReq: 'اختر صلة القرابة.', chooseReq: 'اختر ولي أمر موجودًا.', nameReq: 'أدخل اسم ولي الأمر.', phoneReq: 'أدخل رقم هاتف مغربي صالحًا.', duplicate: 'يوجد أكثر من شخص بنفس رقم الهاتف. اختر وليًا موجودًا.', blocked: 'يوجد شخص بنفس رقم الهاتف لكن لا يمكن ربطه من هذه النافذة.', searchFailed: 'تعذر البحث عن ولي الأمر.' },
  en: { payer: 'Payer', guardian: 'Guardian', student: 'Student', existing: 'Existing guardian', fresh: 'New guardian', search: 'Find an existing guardian', searchPh: 'Name or phone', searchAction: 'Search', noResults: 'No linkable person found.', choose: 'Select guardian', name: 'Guardian name', phone: 'Phone', relation: 'Relationship', relationReq: 'Select a relationship.', chooseReq: 'Select an existing guardian.', nameReq: 'Enter the guardian name.', phoneReq: 'Enter a valid Moroccan phone number.', duplicate: 'More than one person uses this phone. Select an existing guardian.', blocked: 'A person with this phone exists but cannot be linked here.', searchFailed: 'Could not search for the guardian.' },
  fr: { payer: 'Responsable du paiement', guardian: 'Parent / tuteur', student: 'Élève', existing: 'Parent / tuteur existant', fresh: 'Nouveau parent / tuteur', search: 'Rechercher un parent existant', searchPh: 'Nom ou téléphone', searchAction: 'Rechercher', noResults: 'Aucune personne disponible.', choose: 'Choisissez le parent / tuteur', name: 'Nom du parent / tuteur', phone: 'Téléphone', relation: 'Lien de parenté', relationReq: 'Choisissez le lien de parenté.', chooseReq: 'Choisissez un parent / tuteur existant.', nameReq: 'Saisissez le nom du parent / tuteur.', phoneReq: 'Saisissez un numéro marocain valide.', duplicate: 'Plusieurs personnes utilisent ce numéro. Choisissez une personne existante.', blocked: 'Une personne avec ce numéro existe mais ne peut pas être liée ici.', searchFailed: 'Impossible de rechercher le parent.' },
  es: { payer: 'Responsable del pago', guardian: 'Tutor', student: 'Alumno', existing: 'Tutor existente', fresh: 'Tutor nuevo', search: 'Buscar tutor existente', searchPh: 'Nombre o teléfono', searchAction: 'Buscar', noResults: 'No hay ninguna persona disponible.', choose: 'Seleccione el tutor', name: 'Nombre del tutor', phone: 'Teléfono', relation: 'Parentesco', relationReq: 'Seleccione el parentesco.', chooseReq: 'Seleccione un tutor existente.', nameReq: 'Introduzca el nombre del tutor.', phoneReq: 'Introduzca un teléfono marroquí válido.', duplicate: 'Más de una persona usa este teléfono. Seleccione una existente.', blocked: 'Existe una persona con este teléfono pero no puede vincularse aquí.', searchFailed: 'No se pudo buscar el tutor.' },
} as const;

function hasPhone(person: PersonSearchResult): boolean {
  return Boolean(person.phone?.trim() || person.secondary_phone?.trim());
}
function samePhone(person: PersonSearchResult, local: string): boolean {
  return normalizeMoroccanPhone(person.phone ?? '').local === local || normalizeMoroccanPhone(person.secondary_phone ?? '').local === local;
}
function searchLabel(person: PersonSearchResult): string {
  const details = [person.phone || person.secondary_phone, person.role_labels?.join(' · ')].filter(Boolean);
  return details.length ? `${person.name} — ${details.join(' — ')}` : person.name;
}

export function StudentQuickCreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [genderLabel, genderRequired, maleLabel, femaleLabel] = GENDER_COPY[locale];
  const copy = BILLING_COPY[locale];
  const toast = useToast();
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const optionsState = useStudentOptions();
  const levelOptionsState = useLevelOptions(open, { include_enabled: 'true' });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameLatin, setFirstNameLatin] = useState('');
  const [lastNameLatin, setLastNameLatin] = useState('');
  const [gender, setGender] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [payer, setPayer] = useState<Payer>('guardian');
  const [guardianMode, setGuardianMode] = useState<GuardianMode>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [searching, setSearching] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const levelsForYear = useMemo(() => (optionsState.options?.levels ?? []).filter((level) =>
    (level.school_id == null || level.school_id === activeSchoolId) &&
    (level.academic_year_id == null || level.academic_year_id === activeAcademicYearId)),
  [activeAcademicYearId, activeSchoolId, optionsState.options?.levels]);
  const referenceLevels = levelOptionsState.options?.reference_levels ?? [];
  const cycles = levelOptionsState.options?.cycles ?? [];
  const cycleOptions = useMemo(() => buildEnrollmentCycleOptions(levelsForYear, referenceLevels, cycles), [cycles, levelsForYear, referenceLevels]);
  const levels = useMemo(() => filterLevelsByCycleId(levelsForYear, cycleId, referenceLevels, cycles), [cycleId, cycles, levelsForYear, referenceLevels]);
  const optionsLoading = optionsState.loading || levelOptionsState.loading;
  const optionsFailed = Boolean(optionsState.error || levelOptionsState.error);

  useEffect(() => {
    if (!open) return;
    setFirstName(''); setLastName(''); setFirstNameLatin(''); setLastNameLatin(''); setGender(''); setCycleId(''); setLevelId('');
    setPayer('guardian'); setGuardianMode('existing'); setSearchQuery(''); setResults([]); setSelectedPersonId(''); setSearching(false);
    setGuardianName(''); setGuardianPhone(''); setRelationship(''); setError(''); setSubmitting(false);
  }, [open]);

  function validationMessage(code: 'name_ar' | 'name_latin' | 'gender' | 'cycle' | 'level' | 'context'): string {
    if (code === 'name_ar') return t('admin.studentsList.quickCreate.nameArRequired');
    if (code === 'name_latin') return t('admin.studentsList.quickCreate.nameLatinRequired');
    if (code === 'gender') return genderRequired;
    if (code === 'cycle') return t('admin.studentsList.quickCreate.cycleRequired');
    if (code === 'level') return t('admin.studentsList.quickCreate.levelRequired');
    return t('admin.studentsList.quickCreate.contextRequired');
  }
  function guardianValidation(): string | null {
    if (payer !== 'guardian') return null;
    if (!relationship) return copy.relationReq;
    if (guardianMode === 'existing') return selectedPersonId ? null : copy.chooseReq;
    if (!guardianName.trim()) return copy.nameReq;
    if (!validateMoroccanPhone(guardianPhone)) return copy.phoneReq;
    return null;
  }
  async function runSearch(query = searchQuery): Promise<PersonSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const res = await api.get<unknown>(endpoints.admin.guardiansSearch, { q, page: 1, page_size: 20, active_school_id: activeSchoolId ?? undefined });
    if (!res.success) throw new Error(res.error.message || copy.searchFailed);
    return normalizePersonSearchList(res.data).filter((person) => person.can_link_as_guardian);
  }
  async function searchExisting() {
    if (!searchQuery.trim()) { setError(copy.searchFailed); return; }
    setSearching(true); setError('');
    try {
      const list = await runSearch();
      setResults(list); setSelectedPersonId(list.length === 1 ? String(list[0].partner_id) : '');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : copy.searchFailed;
      setResults([]); setSelectedPersonId(''); setError(message); toast.error(message);
    } finally { setSearching(false); }
  }
  function selectedExisting(): PersonSearchResult | null {
    const id = Number(selectedPersonId);
    return Number.isFinite(id) && id > 0 ? results.find((person) => person.partner_id === id) ?? null : null;
  }
  async function resolveNewGuardian(): Promise<GuardianBilling> {
    const localPhone = normalizeMoroccanPhone(guardianPhone).local;
    if (!localPhone) throw new Error(copy.phoneReq);
    const matchesRes = await api.get<unknown>(endpoints.admin.guardiansSearch, { q: moroccanPhoneSearchQuery(guardianPhone), page: 1, page_size: 20, active_school_id: activeSchoolId ?? undefined });
    if (!matchesRes.success) throw new Error(matchesRes.error.message || copy.searchFailed);
    const exact = normalizePersonSearchList(matchesRes.data).filter((person) => samePhone(person, localPhone));
    const linkable = exact.filter((person) => person.can_link_as_guardian);
    if (exact.length > 1) throw new Error(copy.duplicate);
    if (exact.length === 1 && linkable.length === 0) throw new Error(copy.blocked);
    if (linkable.length === 1) return { kind: 'existing', personId: linkable[0].partner_id, hasContactPhone: hasPhone(linkable[0]) };
    return { kind: 'new', fullName: guardianName.trim(), phone: localPhone };
  }
  async function resolveBilling(): Promise<StudentQuickCreateBillingInput> {
    if (payer === 'student') return { mode: 'student' };
    const relationshipType = relationship as RelationshipType;
    if (guardianMode === 'new') return { mode: 'guardian', relationshipType, guardian: await resolveNewGuardian() };
    const person = selectedExisting();
    if (!person) throw new Error(copy.chooseReq);
    return { mode: 'guardian', relationshipType, guardian: { kind: 'existing', personId: person.partner_id, hasContactPhone: hasPhone(person) } };
  }
  async function handleCreate() {
    if (optionsLoading || optionsFailed) return;
    const validation = validateStudentQuickCreateInput({ firstName, lastName, firstNameLatin, lastNameLatin, gender, cycleId, levelId, schoolId: activeSchoolId, academicYearId: activeAcademicYearId });
    if (!validation.valid) { const message = validationMessage(validation.error); setError(message); toast.error(message); return; }
    const guardianError = guardianValidation();
    if (guardianError) { setError(guardianError); toast.error(guardianError); return; }
    setSubmitting(true); setError('');
    try {
      const billing = await resolveBilling();
      const res = await api.post<{ id: number }>(endpoints.admin.students, buildStudentQuickCreatePayload(validation, billing));
      if (!res.success || !res.data) throw new Error(res.success ? t('admin.studentsList.quickCreate.failed') : res.error.message);
      toast.success(t('admin.studentsList.quickCreate.created'));
      const href = buildStudentQuickCreateSuccessHref(res.data.id);
      onCreated(); onClose(); router.push(href);
    } catch (cause) {
      const message = cause instanceof Error && cause.message ? cause.message : t('admin.studentsList.quickCreate.failed');
      setError(message); toast.error(message);
    } finally { setSubmitting(false); }
  }

  if (!open) return null;
  const clear = () => setError('');
  return <ConfirmationDialog open={open} title={t('admin.studentsList.quickCreate.title')} size="form" closeOnBackdrop={!submitting} loading={submitting}
    confirmLabel={t('admin.studentsList.quickCreate.submit')} cancelLabel={t('common.cancel')} onConfirm={handleCreate} onClose={onClose}
    body={<div className="form-stack">
      <p className="muted">{t('admin.studentsList.quickCreate.description')}</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {optionsFailed ? <p className="form-error" role="alert">{t('admin.studentsList.quickCreate.optionsLoadFailed')}</p> : null}
      <div className="grid grid--form">
        <label className="field"><span>{t('admin.studentsList.quickCreate.firstNameAr')}</span><input className="input" value={firstName} onChange={(e) => { setFirstName(e.target.value); clear(); }} autoFocus disabled={submitting} /></label>
        <label className="field"><span>{t('admin.studentsList.quickCreate.lastNameAr')}</span><input className="input" value={lastName} onChange={(e) => { setLastName(e.target.value); clear(); }} disabled={submitting} /></label>
        <label className="field"><span>{t('admin.studentsList.quickCreate.firstNameLatin')}</span><input className="input" dir="ltr" value={firstNameLatin} onChange={(e) => { setFirstNameLatin(e.target.value); clear(); }} disabled={submitting} /></label>
        <label className="field"><span>{t('admin.studentsList.quickCreate.lastNameLatin')}</span><input className="input" dir="ltr" value={lastNameLatin} onChange={(e) => { setLastNameLatin(e.target.value); clear(); }} disabled={submitting} /></label>
        <label className="field"><span>{genderLabel} *</span><select className="input" value={gender} onChange={(e) => { setGender(e.target.value); clear(); }} disabled={submitting || optionsLoading || optionsFailed}><option value="">{t('common.select')}</option>{(optionsState.options?.genders ?? []).map((o) => <option key={o.value} value={o.value}>{o.value === 'male' ? maleLabel : o.value === 'female' ? femaleLabel : o.label}</option>)}</select></label>
        <label className="field"><span>{t('admin.studentsList.quickCreate.cycle')}</span><select className="input" value={cycleId} onChange={(e) => { setCycleId(e.target.value); setLevelId(''); clear(); }} disabled={submitting || optionsLoading || optionsFailed}><option value="">{t('admin.studentsList.quickCreate.selectCycle')}</option>{cycleOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="field"><span>{t('admin.studentsList.quickCreate.level')}</span><select className="input" value={levelId} onChange={(e) => { setLevelId(e.target.value); clear(); }} disabled={submitting || optionsLoading || optionsFailed || !cycleId}><option value="">{cycleId ? t('admin.studentsList.quickCreate.selectLevel') : t('admin.studentsList.quickCreate.selectCycleFirst')}</option>{levels.map((o) => <option key={o.id} value={o.id}>{o.display_name ?? o.display_alias ?? o.name}</option>)}</select></label>
        <label className="field" style={{ gridColumn: '1 / -1' }}><span>{copy.payer}</span><select className="input" value={payer} onChange={(e) => { setPayer(e.target.value as Payer); clear(); }} disabled={submitting}><option value="guardian">{copy.guardian}</option><option value="student">{copy.student}</option></select></label>
        {payer === 'guardian' ? <>
          <label className="field" style={{ gridColumn: '1 / -1' }}><span>{copy.choose}</span><select className="input" value={guardianMode} onChange={(e) => { setGuardianMode(e.target.value as GuardianMode); clear(); }} disabled={submitting}><option value="existing">{copy.existing}</option><option value="new">{copy.fresh}</option></select></label>
          {guardianMode === 'existing' ? <>
            <label className="field" style={{ gridColumn: '1 / -1' }}><span>{copy.search}</span><span style={{ display: 'flex', gap: 8 }}><input className="input" value={searchQuery} placeholder={copy.searchPh} onChange={(e) => { setSearchQuery(e.target.value); setSelectedPersonId(''); clear(); }} disabled={submitting || searching} /><button type="button" className="button button--secondary" onClick={() => void searchExisting()} disabled={submitting || searching}>{searching ? '…' : copy.searchAction}</button></span></label>
            <label className="field" style={{ gridColumn: '1 / -1' }}><span>{copy.choose}</span><select className="input" value={selectedPersonId} onChange={(e) => { setSelectedPersonId(e.target.value); clear(); }} disabled={submitting || searching || results.length === 0}><option value="">{results.length ? t('common.select') : copy.noResults}</option>{results.map((person) => <option key={person.partner_id} value={person.partner_id}>{searchLabel(person)}</option>)}</select></label>
          </> : <><label className="field"><span>{copy.name}</span><input className="input" value={guardianName} onChange={(e) => { setGuardianName(e.target.value); clear(); }} disabled={submitting} /></label><label className="field"><span>{copy.phone}</span><input className="input" dir="ltr" inputMode="tel" value={guardianPhone} onChange={(e) => { setGuardianPhone(e.target.value); clear(); }} disabled={submitting} /></label></>}
          <label className="field" style={{ gridColumn: '1 / -1' }}><span>{copy.relation}</span><select className="input" value={relationship} onChange={(e) => { setRelationship(e.target.value); clear(); }} disabled={submitting}><option value="">{t('common.select')}</option>{RELATIONSHIP_TYPE_CODES.map((code) => <option key={code} value={code}>{relationshipTypeLabel(t, code)}</option>)}</select></label>
        </> : null}
      </div>
    </div>}
  />;
}
