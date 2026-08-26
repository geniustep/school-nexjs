import type { Locale } from '@/lib/i18n/config';

export interface StudentQuickCreateCopy {
  languageLabel: string;
  arabic: string;
  french: string;
  firstName: string;
  lastName: string;
  financialResponsible: string;
  createGuardian: string;
  guardianFullName: string;
  guardianPhone: string;
  guardianRelationship: string;
  addGuardian: string;
  removeGuardian: string;
  guardianRequired: string;
  save: string;
  saveAndAddAnother: string;
  createdInBackground: string;
}

const COPY: Record<Locale, StudentQuickCreateCopy> = {
  ar: {
    languageLabel: 'لغة الاسم',
    arabic: 'العربية',
    french: 'Français',
    firstName: 'الاسم الشخصي',
    lastName: 'اسم العائلة',
    financialResponsible: 'ولي الأمر هو المسؤول عن الأداء',
    createGuardian: 'إنشاء ولي أمر',
    guardianFullName: 'الاسم الكامل',
    guardianPhone: 'الهاتف',
    guardianRelationship: 'صلة القرابة',
    addGuardian: 'إضافة ولي أمر آخر',
    removeGuardian: 'حذف ولي الأمر',
    guardianRequired: 'أكمل الاسم والهاتف وصلة القرابة لكل ولي أمر.',
    save: 'حفظ',
    saveAndAddAnother: 'حفظ وإضافة تلميذ آخر',
    createdInBackground: 'تم تسجيل التلميذ، ويجري استكمال الإعدادات في الخلفية.',
  },
  fr: {
    languageLabel: 'Langue du nom',
    arabic: 'العربية',
    french: 'Français',
    firstName: 'Prénom',
    lastName: 'Nom',
    financialResponsible: "Le responsable légal est responsable du paiement",
    createGuardian: 'Créer un responsable légal',
    guardianFullName: 'Nom complet',
    guardianPhone: 'Téléphone',
    guardianRelationship: 'Lien de parenté',
    addGuardian: 'Ajouter un autre responsable',
    removeGuardian: 'Supprimer le responsable',
    guardianRequired: 'Complétez le nom, le téléphone et le lien de parenté de chaque responsable.',
    save: 'Enregistrer',
    saveAndAddAnother: 'Enregistrer et ajouter un autre élève',
    createdInBackground: "L’élève est inscrit. La configuration se poursuit en arrière-plan.",
  },
  en: {
    languageLabel: 'Name language',
    arabic: 'العربية',
    french: 'Français',
    firstName: 'First name',
    lastName: 'Last name',
    financialResponsible: 'The guardian is responsible for payment',
    createGuardian: 'Create guardian',
    guardianFullName: 'Full name',
    guardianPhone: 'Phone',
    guardianRelationship: 'Relationship',
    addGuardian: 'Add another guardian',
    removeGuardian: 'Remove guardian',
    guardianRequired: 'Complete the name, phone and relationship for every guardian.',
    save: 'Save',
    saveAndAddAnother: 'Save and add another student',
    createdInBackground: 'Student registered. Setup is continuing in the background.',
  },
  es: {
    languageLabel: 'Idioma del nombre',
    arabic: 'العربية',
    french: 'Français',
    firstName: 'Nombre',
    lastName: 'Apellido',
    financialResponsible: 'El tutor es responsable del pago',
    createGuardian: 'Crear tutor',
    guardianFullName: 'Nombre completo',
    guardianPhone: 'Teléfono',
    guardianRelationship: 'Parentesco',
    addGuardian: 'Añadir otro tutor',
    removeGuardian: 'Eliminar tutor',
    guardianRequired: 'Complete el nombre, teléfono y parentesco de cada tutor.',
    save: 'Guardar',
    saveAndAddAnother: 'Guardar y añadir otro alumno',
    createdInBackground: 'Alumno registrado. La configuración continúa en segundo plano.',
  },
};

export function studentQuickCreateCopy(locale: Locale): StudentQuickCreateCopy {
  return COPY[locale];
}
