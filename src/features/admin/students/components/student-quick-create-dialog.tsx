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
import type { GuardianSummary, PersonSearchResult, RelationshipType } from '@/types/student-360';
import { useStudentOptions } from '../hooks/use-student-options';
import { buildEnrollmentCycleOptions, filterLevelsByCycleId } from '../utils/student-enrollment-cycle';
import { linkExistingPersonAsGuardian, normalizeLinkPersonResponse } from '../utils/guardian-link-person';
import { normalizeGuardianQuickCreateResponse } from '../utils/normalize-guardian';
import { normalizePersonSearchList } from '../utils/normalize-person-search';
import {
  moroccanPhoneSearchQuery,
  normalizeMoroccanPhone,
  validateMoroccanPhone,
} from '../utils/normalize-moroccan-phone';
import {
  DEFAULT_RELATIONSHIP_FORM,
  relationshipFormToCreatePayload,
  relationshipFormToLinkPersonPayload,
} from './guardian-relationship-form';
import {
  buildStudentQuickCreatePayload,
  buildStudentQuickCreateSuccessHref,
  validateStudentQuickCreateInput,
} from '../utils/student-quick-create';

type QuickBillingResponsibility = 'guardian' | 'student';
type QuickGuardianMode = 'existing' | 'new';
type QuickGuardian = GuardianSummary | PersonSearchResult;

const QUICK_GENDER_COPY = {
  ar: { label: 'الجنس', required: 'اختر الجنس.', male: 'ذكر', female: 'أنثى' },
  en: { label: 'Gender', required: 'Select a gender.', male: 'Male', female: 'Female' },
  fr: { label: 'Sexe', required: 'Choisissez le sexe.', male: 'Garçon', female: 'Fille' },
  es: { label: 'Sexo', required: 'Seleccione el sexo.', male: 'Masculino', female: 'Femenino' },
} as const;

const QUICK_BILLING_COPY = {
  ar: {
    responsibility: 'المسؤول عن الأداء',
    guardian: 'ولي الأمر',
    student: 'التلميذ',
    hint: 'يمكنك تحديد المسؤول الآن دون تغيير خطوات تجهيز التلميذ.',
    createGuardianNow: 'ربط أو إضافة ولي أمر الآن',
    createGuardianHint: 'يمكن اختيار شخص موجود أو إضافة ولي جديد، ثم ربطه بالتلميذ قبل فتح الملف.',
    existingGuardian: 'ولي أمر موجود',
    newGuardian: 'ولي أمر جديد',
    existingSearch: 'البحث عن ولي موجود',
    existingSearchPlaceholder: 'الاسم أو رقم الهاتف',
    searchAction: 'بحث',
    searchRequired: 'أدخل اسمًا أو رقم هاتف للبحث.',
    noSearchResults: 'لم نجد شخصًا متاحًا للربط بهذه البيانات.',
    selectExistingGuardian: 'اختر ولي الأمر',
    existingGuardianRequired: 'اختر ولي أمر موجودًا من نتائج البحث.',
    guardianName: 'اسم ولي الأمر',
    guardianPhone: 'الهاتف',
    relationship: 'صلة القرابة',
    guardianNameRequired: 'أدخل اسم ولي الأمر.',
    guardianPhoneRequired: 'أدخل رقم هاتف مغربي صالحًا.',
    relationshipRequired: 'اختر صلة القرابة.',
    duplicateGuardian: 'يوجد أكثر من شخص بنفس رقم الهاتف. اختر وليًا موجودًا من البحث لتجنب اختيار شخص بالخطأ.',
    existingGuardianBlocked: 'يوجد شخص بنفس رقم الهاتف، لكن لا يمكن ربطه كولي من هذه النافذة. أكمل العملية من ملف التلميذ.',
    guardianSearchFailed: 'تعذر البحث عن ولي الأمر. لم ننشئ وليًا جديدًا لتجنب التكرار.',
    guardianCreateFailed: 'تم إنشاء التلميذ، لكن تعذر إنشاء ولي الأمر.',
    guardianLinkFailed: 'تم إنشاء التلميذ، لكن تعذر ربط ولي الأمر.',
    billingSetupFailed: 'تم إنشاء التلميذ، لكن تعذر تحديد المسؤول عن الأداء الآن. يمكنك إكماله من الملف المالي.',
  },
  en: {
    responsibility: 'Payer',
    guardian: 'Guardian',
    student: 'Student',
    hint: 'Set the payer now without changing the student setup steps.',
    createGuardianNow: 'Link or add a guardian now',
    createGuardianHint: 'Choose an existing person or add a new guardian, then link them before opening the student profile.',
    existingGuardian: 'Existing guardian',
    newGuardian: 'New guardian',
    existingSearch: 'Find an existing guardian',
    existingSearchPlaceholder: 'Name or phone number',
    searchAction: 'Search',
    searchRequired: 'Enter a name or phone number to search.',
    noSearchResults: 'No person available for linking matches this search.',
    selectExistingGuardian: 'Select guardian',
    existingGuardianRequired: 'Select an existing guardian from the search results.',
    guardianName: 'Guardian name',
    guardianPhone: 'Phone',
    relationship: 'Relationship',
    guardianNameRequired: 'Enter the guardian name.',
    guardianPhoneRequired: 'Enter a valid Moroccan phone number.',
    relationshipRequired: 'Select a relationship.',
    duplicateGuardian: 'More than one person uses this phone number. Select an existing guardian from search to avoid choosing the wrong person.',
    existingGuardianBlocked: 'A person with this phone already exists but cannot be linked here. Finish the operation from the student profile.',
    guardianSearchFailed: 'Could not search for the guardian. No new guardian was created to avoid duplicates.',
    guardianCreateFailed: 'The student was created, but the guardian could not be created.',
    guardianLinkFailed: 'The student was created, but the guardian could not be linked.',
    billingSetupFailed: 'The student was created, but the payer could not be set now. You can complete it from the finance profile.',
  },
  fr: {
    responsibility: 'Responsable du paiement',
    guardian: 'Parent / tuteur',
    student: 'Élève',
    hint: "Définissez le responsable maintenant sans modifier les étapes de préparation de l'élève.",
    createGuardianNow: 'Lier ou ajouter un parent / tuteur maintenant',
    createGuardianHint: "Choisissez une personne existante ou ajoutez un nouveau parent, puis liez-la avant d'ouvrir le dossier élève.",
    existingGuardian: 'Parent / tuteur existant',
    newGuardian: 'Nouveau parent / tuteur',
    existingSearch: 'Rechercher un parent existant',
    existingSearchPlaceholder: 'Nom ou numéro de téléphone',
    searchAction: 'Rechercher',
    searchRequired: 'Saisissez un nom ou un numéro de téléphone.',
    noSearchResults: 'Aucune personne disponible pour le lien ne correspond à cette recherche.',
    selectExistingGuardian: 'Choisissez le parent / tuteur',
    existingGuardianRequired: 'Choisissez un parent / tuteur existant dans les résultats.',
    guardianName: 'Nom du parent / tuteur',
    guardianPhone: 'Téléphone',
    relationship: 'Lien de parenté',
    guardianNameRequired: 'Saisissez le nom du parent / tuteur.',
    guardianPhoneRequired: 'Saisissez un numéro de téléphone marocain valide.',
    relationshipRequired: 'Choisissez le lien de parenté.',
    duplicateGuardian: "Plusieurs personnes utilisent ce numéro. Choisissez un parent existant dans la recherche afin d'éviter une mauvaise sélection.",
    existingGuardianBlocked: "Une personne avec ce téléphone existe déjà mais ne peut pas être liée ici. Terminez l'opération depuis le dossier élève.",
    guardianSearchFailed: "Impossible de rechercher le parent. Aucun nouveau parent n'a été créé afin d'éviter un doublon.",
    guardianCreateFailed: "L'élève a été créé, mais le parent / tuteur n'a pas pu être créé.",
    guardianLinkFailed: "L'élève a été créé, mais le parent / tuteur n'a pas pu être lié.",
    billingSetupFailed: "L'élève a été créé, mais le responsable du paiement n'a pas pu être défini maintenant. Vous pouvez le compléter dans le dossier financier.",
  },
  es: {
    responsibility: 'Responsable del pago',
    guardian: 'Tutor',
    student: 'Alumno',
    hint: 'Defina ahora el responsable sin cambiar los pasos de preparación del alumno.',
    createGuardianNow: 'Vincular o añadir un tutor ahora',
    createGuardianHint: 'Elija una persona existente o añada un tutor nuevo y vincúlelo antes de abrir la ficha del alumno.',
    existingGuardian: 'Tutor existente',
    newGuardian: 'Tutor nuevo',
    existingSearch: 'Buscar tutor existente',
    existingSearchPlaceholder: 'Nombre o teléfono',
    searchAction: 'Buscar',
    searchRequired: 'Introduzca un nombre o un teléfono para buscar.',
    noSearchResults: 'No hay ninguna persona disponible para vincular que coincida con la búsqueda.',
    selectExistingGuardian: 'Seleccione el tutor',
    existingGuardianRequired: 'Seleccione un tutor existente de los resultados.',
    guardianName: 'Nombre del tutor',
    guardianPhone: 'Teléfono',
    relationship: 'Parentesco',
    guardianNameRequired: 'Introduzca el nombre del tutor.',
    guardianPhoneRequired: 'Introduzca un número de teléfono marroquí válido.',
    relationshipRequired: 'Seleccione el parentesco.',
    duplicateGuardian: 'Más de una persona usa este teléfono. Seleccione un tutor existente de la búsqueda para evitar elegir a la persona equivocada.',
    existingGuardianBlocked: 'Ya existe una persona con este teléfono, pero no puede vincularse aquí. Termine la operación desde la ficha del alumno.',
    guardianSearchFailed: 'No se pudo buscar el tutor. No se creó uno nuevo para evitar duplicados.',
    guardianCreateFailed: 'El alumno fue creado, pero no se pudo crear el tutor.',
    guardianLinkFailed: 'El alumno fue creado, pero no se pudo vincular el tutor.',
    billingSetupFailed: 'El alumno fue creado, pero no se pudo definir ahora el responsable del pago. Puede completarlo desde la ficha financiera.',
  },
} as const;

const QUICK_RELATIONSHIP_COPY: Record<'ar' | 'en' | 'fr' | 'es', Record<string, string>> = {
  ar: {
    father: 'الأب',
    mother: 'الأم',
    legal_guardian: 'ولي الأمر',
    grandparent: 'الجد/الجدة',
    grandfather: 'الجد',
    grandmother: 'الجدة',
    sibling: 'أخ/أخت',
    brother: 'الأخ',
    sister: 'الأخت',
    uncle: 'العم/الخال',
    aunt: 'العمة/الخالة',
    other: 'أخرى',
  },
  en: {
    father: 'Father',
    mother: 'Mother',
    legal_guardian: 'Legal guardian',
    grandparent: 'Grandparent',
    grandfather: 'Grandfather',
    grandmother: 'Grandmother',
    sibling: 'Sibling',
    brother: 'Brother',
    sister: 'Sister',
    uncle: 'Uncle',
    aunt: 'Aunt',
    other: 'Other',
  },
  fr: {
    father: 'Père',
    mother: 'Mère',
    legal_guardian: 'Tuteur légal',
    grandparent: 'Grand-parent',
    grandfather: 'Grand-père',
    grandmother: 'Grand-mère',
    sibling: 'Frère / sœur',
    brother: 'Frère',
    sister: 'Sœur',
    uncle: 'Oncle',
    aunt: 'Tante',
    other: 'Autre',
  },
  es: {
    father: 'Padre',
    mother: 'Madre',
    legal_guardian: 'Tutor legal',
    grandparent: 'Abuelo/a',
    grandfather: 'Abuelo',
    grandmother: 'Abuela',
    sibling: 'Hermano/a',
    brother: 'Hermano',
    sister: 'Hermana',
    uncle: 'Tío',
    aunt: 'Tía',
    other: 'Otro',
  },
};

function guardianId(guardian: QuickGuardian): number | null {
  if (typeof guardian.guardian_id === 'number' && guardian.guardian_id > 0) return guardian.guardian_id;
  if (!('can_link_as_guardian' in guardian) && Number.isFinite(guardian.id) && guardian.id > 0) return guardian.id;
  return null;
}

function guardianPartnerId(guardian: QuickGuardian): number | null {
  return typeof guardian.partner_id === 'number' && guardian.partner_id > 0 ? guardian.partner_id : null;
}

function samePhone(guardian: QuickGuardian, expectedLocalPhone: string): boolean {
  const primary = normalizeMoroccanPhone(guardian.phone ?? '').local;
  const secondary = normalizeMoroccanPhone(guardian.secondary_phone ?? '').local;
  return primary === expectedLocalPhone || secondary === expectedLocalPhone;
}

function guardianHasContactPhone(guardian: QuickGuardian): boolean {
  return Boolean(guardian.phone?.trim() || guardian.secondary_phone?.trim());
}

function guardianSearchLabel(guardian: PersonSearchResult): string {
  const details = [guardian.phone || guardian.secondary_phone, guardian.role_labels?.join(' · ')].filter(Boolean);
  return details.length > 0 ? `${guardian.name} — ${details.join(' — ')}` : guardian.name;
}

export function StudentQuickCreateDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const genderCopy = QUICK_GENDER_COPY[locale];
  const billingCopy = QUICK_BILLING_COPY[locale];
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
  const [billingResponsibility, setBillingResponsibility] = useState<QuickBillingResponsibility>('guardian');
  const [createGuardianNow, setCreateGuardianNow] = useState(false);
  const [guardianMode, setGuardianMode] = useState<QuickGuardianMode>('existing');
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const [guardianSearchResults, setGuardianSearchResults] = useState<PersonSearchResult[]>([]);
  const [selectedGuardianPartnerId, setSelectedGuardianPartnerId] = useState('');
  const [guardianSearchLoading, setGuardianSearchLoading] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const levelsForYear = useMemo(
    () => (optionsState.options?.levels ?? []).filter(
      (level) =>
        (level.school_id == null || level.school_id === activeSchoolId) &&
        (level.academic_year_id == null || level.academic_year_id === activeAcademicYearId),
    ),
    [activeAcademicYearId, activeSchoolId, optionsState.options?.levels],
  );
  const genders = optionsState.options?.genders ?? [];
  const guardianRelationships = optionsState.options?.emergencyRelationships ?? [];
  const referenceLevels = levelOptionsState.options?.reference_levels ?? [];
  const cycles = levelOptionsState.options?.cycles ?? [];
  const cycleOptions = useMemo(
    () => buildEnrollmentCycleOptions(levelsForYear, referenceLevels, cycles),
    [cycles, levelsForYear, referenceLevels],
  );
  const levels = useMemo(
    () => filterLevelsByCycleId(levelsForYear, cycleId, referenceLevels, cycles),
    [cycleId, cycles, levelsForYear, referenceLevels],
  );
  const optionsLoading = optionsState.loading || levelOptionsState.loading;
  const optionsFailed = Boolean(optionsState.error || levelOptionsState.error);

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setFirstNameLatin('');
    setLastNameLatin('');
    setGender('');
    setCycleId('');
    setLevelId('');
    setError('');
    setBillingResponsibility('guardian');
    setCreateGuardianNow(false);
    setGuardianMode('existing');
    setGuardianSearchQuery('');
    setGuardianSearchResults([]);
    setSelectedGuardianPartnerId('');
    setGuardianSearchLoading(false);
    setGuardianName('');
    setGuardianPhone('');
    setGuardianRelationship('');
  }, [open]);

  function validationMessage(code: 'name_ar' | 'name_latin' | 'gender' | 'cycle' | 'level' | 'context'): string {
    if (code === 'name_ar') return t('admin.studentsList.quickCreate.nameArRequired');
    if (code === 'name_latin') return t('admin.studentsList.quickCreate.nameLatinRequired');
    if (code === 'gender') return genderCopy.required;
    if (code === 'cycle') return t('admin.studentsList.quickCreate.cycleRequired');
    if (code === 'level') return t('admin.studentsList.quickCreate.levelRequired');
    return t('admin.studentsList.quickCreate.contextRequired');
  }

  function genderLabel(value: string, fallback: string): string {
    if (value === 'male') return genderCopy.male;
    if (value === 'female') return genderCopy.female;
    return fallback;
  }

  function relationshipLabel(value: string, fallback: string): string {
    return QUICK_RELATIONSHIP_COPY[locale]?.[value] ?? fallback;
  }

  function validateQuickGuardian(): string | null {
    if (billingResponsibility !== 'guardian' || !createGuardianNow) return null;
    if (!guardianRelationship.trim()) return billingCopy.relationshipRequired;
    if (guardianMode === 'existing') {
      if (!selectedGuardianPartnerId) return billingCopy.existingGuardianRequired;
      return null;
    }
    if (!guardianName.trim()) return billingCopy.guardianNameRequired;
    if (!validateMoroccanPhone(guardianPhone)) return billingCopy.guardianPhoneRequired;
    return null;
  }

  async function searchExistingGuardians(): Promise<void> {
    const query = guardianSearchQuery.trim();
    if (!query) {
      setGuardianSearchResults([]);
      setSelectedGuardianPartnerId('');
      setError(billingCopy.searchRequired);
      return;
    }
    setGuardianSearchLoading(true);
    setError('');
    const searchRes = await api.get<unknown>(endpoints.admin.guardiansSearch, {
      q: query,
      page: 1,
      page_size: 20,
      active_school_id: activeSchoolId ?? undefined,
    });
    setGuardianSearchLoading(false);
    if (!searchRes.success) {
      setGuardianSearchResults([]);
      setSelectedGuardianPartnerId('');
      const message = searchRes.error.message || billingCopy.guardianSearchFailed;
      setError(message);
      toast.error(message);
      return;
    }
    const results = normalizePersonSearchList(searchRes.data).filter((person) => person.can_link_as_guardian);
    setGuardianSearchResults(results);
    setSelectedGuardianPartnerId(results.length === 1 ? String(results[0].partner_id) : '');
  }

  function selectedExistingGuardian(): PersonSearchResult | null {
    const partnerId = Number(selectedGuardianPartnerId);
    if (!Number.isFinite(partnerId) || partnerId <= 0) return null;
    return guardianSearchResults.find((person) => person.partner_id === partnerId) ?? null;
  }

  async function resolveNewGuardian(): Promise<QuickGuardian> {
    const localPhone = normalizeMoroccanPhone(guardianPhone).local;
    if (!localPhone) throw new Error(billingCopy.guardianPhoneRequired);
    const searchRes = await api.get<unknown>(endpoints.admin.guardiansSearch, {
      q: moroccanPhoneSearchQuery(guardianPhone),
      page: 1,
      page_size: 20,
      active_school_id: activeSchoolId ?? undefined,
    });
    if (!searchRes.success) throw new Error(billingCopy.guardianSearchFailed);
    const exactMatches = normalizePersonSearchList(searchRes.data).filter((person) => samePhone(person, localPhone));
    const linkableMatches = exactMatches.filter((person) => person.can_link_as_guardian);
    if (linkableMatches.length === 1 && exactMatches.length === 1) return linkableMatches[0];
    if (exactMatches.length > 1) throw new Error(billingCopy.duplicateGuardian);
    if (exactMatches.length === 1) throw new Error(billingCopy.existingGuardianBlocked);
    const createRes = await api.post<unknown>(endpoints.admin.guardiansQuickCreate, {
      name: guardianName.trim(),
      phone: localPhone,
    });
    if (!createRes.success) throw new Error(createRes.error.message || billingCopy.guardianCreateFailed);
    const created = normalizeGuardianQuickCreateResponse(createRes.data);
    if (!created) throw new Error(billingCopy.guardianCreateFailed);
    return created;
  }

  async function resolveGuardianForLink(): Promise<QuickGuardian> {
    if (guardianMode === 'existing') {
      const existing = selectedExistingGuardian();
      if (!existing) throw new Error(billingCopy.existingGuardianRequired);
      return existing;
    }
    return resolveNewGuardian();
  }

  async function linkGuardianToStudent(studentId: number, guardian: QuickGuardian): Promise<QuickGuardian> {
    const enableContactFeatures = guardianHasContactPhone(guardian);
    const relationshipValues = {
      ...DEFAULT_RELATIONSHIP_FORM,
      relationship_type: guardianRelationship as RelationshipType,
      is_primary_contact: true,
      is_financial_responsible: false,
      receives_notifications: enableContactFeatures,
      is_emergency_contact: enableContactFeatures,
    };
    const partnerId = guardianPartnerId(guardian);
    if (partnerId != null) {
      const linkRes = await linkExistingPersonAsGuardian(
        studentId,
        relationshipFormToLinkPersonPayload({ partner_id: partnerId }, relationshipValues),
      );
      if (!linkRes.success) throw new Error(linkRes.error.message || billingCopy.guardianLinkFailed);
      return normalizeLinkPersonResponse(linkRes.data)?.guardian ?? guardian;
    }
    const id = guardianId(guardian);
    if (id == null) throw new Error(billingCopy.guardianLinkFailed);
    const linkRes = await api.post(
      endpoints.admin.studentGuardians(studentId),
      relationshipFormToCreatePayload(id, relationshipValues),
    );
    if (!linkRes.success) throw new Error(linkRes.error.message || billingCopy.guardianLinkFailed);
    return guardian;
  }

  async function initializeStudentBillingProfile(studentId: number): Promise<void> {
    const response = await api.put<unknown>(endpoints.admin.financeBillingProfile(studentId), {
      billing_party_type: 'self',
      confirm_self_billing: true,
      activate: true,
    });
    if (!response.success) throw new Error(response.error.message || billingCopy.billingSetupFailed);
  }

  async function initializeGuardianBillingProfile(studentId: number, guardian: QuickGuardian): Promise<void> {
    const partnerId = guardianPartnerId(guardian);
    if (partnerId == null) throw new Error(billingCopy.billingSetupFailed);
    const id = guardianId(guardian);
    const payload: Record<string, unknown> = {
      billing_party_type: 'guardian',
      billing_partner_id: partnerId,
      activate: true,
    };
    if (id != null) payload.guardian_id = id;
    const response = await api.put<unknown>(endpoints.admin.financeBillingProfile(studentId), payload);
    if (!response.success) throw new Error(response.error.message || billingCopy.billingSetupFailed);
  }

  async function runPostCreateBilling(studentId: number): Promise<void> {
    if (billingResponsibility === 'guardian' && !createGuardianNow) return;
    if (billingResponsibility === 'student') {
      await initializeStudentBillingProfile(studentId);
      return;
    }
    const guardian = await resolveGuardianForLink();
    const linkedGuardian = await linkGuardianToStudent(studentId, guardian);
    await initializeGuardianBillingProfile(studentId, linkedGuardian);
  }

  async function handleCreate() {
    if (optionsLoading || optionsFailed) return;
    const validation = validateStudentQuickCreateInput({
      firstName,
      lastName,
      firstNameLatin,
      lastNameLatin,
      gender,
      cycleId,
      levelId,
      schoolId: activeSchoolId,
      academicYearId: activeAcademicYearId,
    });
    if (!validation.valid) {
      const message = validationMessage(validation.error);
      setError(message);
      toast.error(message);
      return;
    }
    const guardianValidation = validateQuickGuardian();
    if (guardianValidation) {
      setError(guardianValidation);
      toast.error(guardianValidation);
      return;
    }
    setError('');
    setSubmitting(true);
    const res = await api.post<{ id: number }>(
      endpoints.admin.students,
      buildStudentQuickCreatePayload(validation),
    );
    if (!res.success || !res.data) {
      setSubmitting(false);
      const message = res.success ? t('admin.studentsList.quickCreate.failed') : res.error.message;
      setError(message);
      toast.error(message);
      return;
    }
    const studentId = res.data.id;
    let followUpError: string | null = null;
    try {
      await runPostCreateBilling(studentId);
    } catch (cause) {
      followUpError = cause instanceof Error && cause.message ? cause.message : billingCopy.billingSetupFailed;
    }
    setSubmitting(false);
    toast.success(t('admin.studentsList.quickCreate.created'));
    if (followUpError) toast.error(followUpError);
    const studentHref = buildStudentQuickCreateSuccessHref(studentId);
    onCreated();
    onClose();
    router.push(studentHref);
  }

  if (!open) return null;
  const clearError = () => setError('');
  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.studentsList.quickCreate.title')}
      body={(
        <div className="form-stack">
          <p className="muted">{t('admin.studentsList.quickCreate.description')}</p>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {optionsFailed ? <p className="form-error" role="alert">{t('admin.studentsList.quickCreate.optionsLoadFailed')}</p> : null}
          <div className="grid grid--form">
            <label className="field">
              <span>{t('admin.studentsList.quickCreate.firstNameAr')}</span>
              <input className="input" value={firstName} onChange={(event) => { setFirstName(event.target.value); clearError(); }} autoFocus autoComplete="given-name" disabled={submitting} />
            </label>
            <label className="field">
              <span>{t('admin.studentsList.quickCreate.lastNameAr')}</span>
              <input className="input" value={lastName} onChange={(event) => { setLastName(event.target.value); clearError(); }} autoComplete="family-name" disabled={submitting} />
            </label>
            <label className="field">
              <span>{t('admin.studentsList.quickCreate.firstNameLatin')}</span>
              <input className="input" dir="ltr" value={firstNameLatin} onChange={(event) => { setFirstNameLatin(event.target.value); clearError(); }} autoComplete="given-name" disabled={submitting} />
            </label>
            <label className="field">
              <span>{t('admin.studentsList.quickCreate.lastNameLatin')}</span>
              <input className="input" dir="ltr" value={lastNameLatin} onChange={(event) => { setLastNameLatin(event.target.value); clearError(); }} autoComplete="family-name" disabled={submitting} />
            </label>
            <label className="field">
              <span>{genderCopy.label} *</span>
              <select className="input" value={gender} onChange={(event) => { setGender(event.target.value); clearError(); }} disabled={submitting || optionsLoading || optionsFailed} required>
                <option value="">{t('common.select')}</option>
                {genders.map((option) => <option key={option.value} value={option.value}>{genderLabel(option.value, option.label)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t('admin.studentsList.quickCreate.cycle')}</span>
              <select className="input" value={cycleId} onChange={(event) => { setCycleId(event.target.value); setLevelId(''); clearError(); }} disabled={submitting || optionsLoading || optionsFailed}>
                <option value="">{optionsLoading ? t('admin.studentsList.quickCreate.optionsLoading') : t('admin.studentsList.quickCreate.selectCycle')}</option>
                {cycleOptions.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t('admin.studentsList.quickCreate.level')}</span>
              <select className="input" value={levelId} onChange={(event) => { setLevelId(event.target.value); clearError(); }} disabled={submitting || optionsLoading || optionsFailed || !cycleId}>
                <option value="">{cycleId ? t('admin.studentsList.quickCreate.selectLevel') : t('admin.studentsList.quickCreate.selectCycleFirst')}</option>
                {levels.map((level) => <option key={level.id} value={level.id}>{level.display_name ?? level.display_alias ?? level.name}</option>)}
              </select>
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>{billingCopy.responsibility}</span>
              <select
                className="input"
                value={billingResponsibility}
                onChange={(event) => {
                  const next = event.target.value as QuickBillingResponsibility;
                  setBillingResponsibility(next);
                  if (next === 'student') setCreateGuardianNow(false);
                  clearError();
                }}
                disabled={submitting}
              >
                <option value="guardian">{billingCopy.guardian}</option>
                <option value="student">{billingCopy.student}</option>
              </select>
              <small className="muted">{billingCopy.hint}</small>
            </label>
            {billingResponsibility === 'guardian' ? (
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={createGuardianNow}
                    onChange={(event) => { setCreateGuardianNow(event.target.checked); clearError(); }}
                    disabled={submitting}
                  />
                  {billingCopy.createGuardianNow}
                </span>
                <small className="muted">{billingCopy.createGuardianHint}</small>
              </label>
            ) : null}
            {billingResponsibility === 'guardian' && createGuardianNow ? (
              <>
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>{billingCopy.selectExistingGuardian}</span>
                  <select
                    className="input"
                    value={guardianMode}
                    onChange={(event) => {
                      setGuardianMode(event.target.value as QuickGuardianMode);
                      clearError();
                    }}
                    disabled={submitting}
                  >
                    <option value="existing">{billingCopy.existingGuardian}</option>
                    <option value="new">{billingCopy.newGuardian}</option>
                  </select>
                </label>
                {guardianMode === 'existing' ? (
                  <>
                    <label className="field" style={{ gridColumn: '1 / -1' }}>
                      <span>{billingCopy.existingSearch}</span>
                      <span style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={guardianSearchQuery}
                          placeholder={billingCopy.existingSearchPlaceholder}
                          onChange={(event) => {
                            setGuardianSearchQuery(event.target.value);
                            setSelectedGuardianPartnerId('');
                            clearError();
                          }}
                          disabled={submitting || guardianSearchLoading}
                        />
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => { void searchExistingGuardians(); }}
                          disabled={submitting || guardianSearchLoading}
                        >
                          {guardianSearchLoading ? '…' : billingCopy.searchAction}
                        </button>
                      </span>
                    </label>
                    <label className="field" style={{ gridColumn: '1 / -1' }}>
                      <span>{billingCopy.selectExistingGuardian}</span>
                      <select
                        className="input"
                        value={selectedGuardianPartnerId}
                        onChange={(event) => { setSelectedGuardianPartnerId(event.target.value); clearError(); }}
                        disabled={submitting || guardianSearchLoading || guardianSearchResults.length === 0}
                      >
                        <option value="">{guardianSearchResults.length === 0 ? billingCopy.noSearchResults : t('common.select')}</option>
                        {guardianSearchResults.map((person) => (
                          <option key={person.partner_id} value={person.partner_id}>{guardianSearchLabel(person)}</option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field">
                      <span>{billingCopy.guardianName}</span>
                      <input className="input" value={guardianName} onChange={(event) => { setGuardianName(event.target.value); clearError(); }} disabled={submitting} />
                    </label>
                    <label className="field">
                      <span>{billingCopy.guardianPhone}</span>
                      <input className="input" dir="ltr" inputMode="tel" value={guardianPhone} onChange={(event) => { setGuardianPhone(event.target.value); clearError(); }} disabled={submitting} />
                    </label>
                  </>
                )}
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <span>{billingCopy.relationship}</span>
                  <select className="input" value={guardianRelationship} onChange={(event) => { setGuardianRelationship(event.target.value); clearError(); }} disabled={submitting || optionsLoading || optionsFailed}>
                    <option value="">{t('common.select')}</option>
                    {guardianRelationships.map((option) => (
                      <option key={option.value} value={option.value}>{relationshipLabel(option.value, option.label)}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
        </div>
      )}
      size="form"
      closeOnBackdrop={!submitting}
      loading={submitting}
      confirmLabel={t('admin.studentsList.quickCreate.submit')}
      cancelLabel={t('common.cancel')}
      onConfirm={handleCreate}
      onClose={onClose}
    />
  );
}
