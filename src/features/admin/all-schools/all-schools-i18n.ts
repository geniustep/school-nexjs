'use client';

import { useLocale } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';

export interface AllSchoolsCopy {
  allSchools: string;
  readOnly: string;
  school: string;
  switchFailed: string;
  chooseSchoolForAction: string;
  massar: string;
  phone: string;
  searchParents: string;
  bySchool: string;
  attendanceToday: string;
  present: string;
  absent: string;
  late: string;
}

const COPY: Record<Locale, AllSchoolsCopy> = {
  ar: {
    allSchools: 'كل المدارس',
    readOnly: 'عرض موحّد للقراءة فقط عبر المدارس المصرح بها.',
    school: 'المدرسة',
    switchFailed: 'تعذر الانتقال إلى مدرسة السجل. لم يتم فتحه.',
    chooseSchoolForAction: 'اختر مدرسة محددة لتنفيذ هذا الإجراء.',
    massar: 'رقم مسار',
    phone: 'الهاتف',
    searchParents: 'البحث عن ولي أمر',
    bySchool: 'تفصيل حسب المدرسة',
    attendanceToday: 'حضور اليوم',
    present: 'حاضر',
    absent: 'غائب',
    late: 'متأخر',
  },
  fr: {
    allSchools: 'Tous les établissements',
    readOnly: 'Vue en lecture seule de vos établissements autorisés.',
    school: 'Établissement',
    switchFailed: 'Impossible de basculer vers l’établissement de la fiche. La fiche n’a pas été ouverte.',
    chooseSchoolForAction: 'Choisissez un établissement précis pour effectuer cette action.',
    massar: 'Code Massar',
    phone: 'Téléphone',
    searchParents: 'Rechercher un responsable',
    bySchool: 'Détail par établissement',
    attendanceToday: 'Présence aujourd’hui',
    present: 'Présents',
    absent: 'Absents',
    late: 'En retard',
  },
  en: {
    allSchools: 'All schools',
    readOnly: 'Read-only view across your authorized schools.',
    school: 'School',
    switchFailed: 'Could not switch to the record school. The record was not opened.',
    chooseSchoolForAction: 'Choose a specific school to perform this action.',
    massar: 'Massar code',
    phone: 'Phone',
    searchParents: 'Search guardians',
    bySchool: 'Breakdown by school',
    attendanceToday: 'Attendance today',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
  },
  es: {
    allSchools: 'Todos los centros',
    readOnly: 'Vista de solo lectura de los centros autorizados.',
    school: 'Centro',
    switchFailed: 'No se pudo cambiar al centro de la ficha. La ficha no se abrió.',
    chooseSchoolForAction: 'Elija un centro específico para realizar esta acción.',
    massar: 'Código Massar',
    phone: 'Teléfono',
    searchParents: 'Buscar responsables',
    bySchool: 'Detalle por centro',
    attendanceToday: 'Asistencia de hoy',
    present: 'Presentes',
    absent: 'Ausentes',
    late: 'Con retraso',
  },
};

export function allSchoolsLabel(locale: Locale): string {
  return COPY[locale].allSchools;
}

export function useAllSchoolsCopy(): AllSchoolsCopy {
  const { locale } = useLocale();
  return COPY[locale];
}
