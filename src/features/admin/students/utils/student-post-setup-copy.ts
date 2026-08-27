import type { Locale } from '@/lib/i18n/config';

export type StudentPostSetupCopy = {
  inProgressTitle: string;
  completeTitle: string;
  reviewTitle: string;
  description: string;
  checking: string;
  loadFailed: string;
  stillWorking: string;
  retry: string;
  progressLabel: string;
  unknownStep: string;
  stepLabels: Record<string, string>;
  statusLabels: Record<string, string>;
};

const COPY: Record<Locale, StudentPostSetupCopy> = {
  ar: {
    inProgressTitle: 'جاري تجهيز التلميذ',
    completeTitle: 'اكتمل تجهيز التلميذ',
    reviewTitle: 'اكتمل التجهيز مع ملاحظات',
    description: 'تم التسجيل. يمكنك متابعة العمل بينما نُكمل القسم والحساب وواجبات التمدرس.',
    checking: 'جارٍ التحقق من تقدم التجهيز…',
    loadFailed: 'تعذر التحقق من تقدم التجهيز الآن.',
    stillWorking: 'تستغرق المعالجة وقتًا أطول من المعتاد. يمكنك متابعة العمل أو إعادة التحقق.',
    retry: 'إعادة التحقق',
    progressLabel: 'تقدم تجهيز التلميذ',
    unknownStep: 'خطوة تجهيز',
    stepLabels: {
      class_assignment: 'الإدراج في القسم',
      account: 'إنشاء حساب التلميذ',
      financial_plan: 'إعداد واجبات التمدرس',
    },
    statusLabels: {
      pending: 'جارٍ التنفيذ',
      completed: 'تم',
      unavailable: 'غير متاح',
      ambiguous: 'يحتاج مراجعة',
      warning: 'تم مع ملاحظة',
      failed: 'تعذر الإكمال',
      not_requested: 'غير مطلوب',
    },
  },
  en: {
    inProgressTitle: 'Preparing the student',
    completeTitle: 'Student setup complete',
    reviewTitle: 'Setup complete with notes',
    description: 'Registration is complete. You can keep working while class, account, and tuition setup finish in the background.',
    checking: 'Checking setup progress…',
    loadFailed: 'Setup progress is temporarily unavailable.',
    stillWorking: 'Setup is taking longer than usual. You can keep working or check again.',
    retry: 'Check again',
    progressLabel: 'Student setup progress',
    unknownStep: 'Setup step',
    stepLabels: {
      class_assignment: 'Class placement',
      account: 'Student account',
      financial_plan: 'Tuition setup',
    },
    statusLabels: {
      pending: 'In progress',
      completed: 'Done',
      unavailable: 'Unavailable',
      ambiguous: 'Needs review',
      warning: 'Done with note',
      failed: 'Could not complete',
      not_requested: 'Not required',
    },
  },
  fr: {
    inProgressTitle: "Préparation de l'élève",
    completeTitle: "Préparation de l'élève terminée",
    reviewTitle: 'Préparation terminée avec remarques',
    description: "L'inscription est terminée. Vous pouvez continuer pendant la préparation de la classe, du compte et des frais de scolarité.",
    checking: 'Vérification de la progression…',
    loadFailed: 'La progression est momentanément indisponible.',
    stillWorking: 'La préparation prend plus de temps que prévu. Vous pouvez continuer ou vérifier à nouveau.',
    retry: 'Vérifier à nouveau',
    progressLabel: "Progression de la préparation de l'élève",
    unknownStep: 'Étape de préparation',
    stepLabels: {
      class_assignment: 'Affectation à la classe',
      account: "Compte de l'élève",
      financial_plan: 'Frais de scolarité',
    },
    statusLabels: {
      pending: 'En cours',
      completed: 'Terminé',
      unavailable: 'Indisponible',
      ambiguous: 'À vérifier',
      warning: 'Terminé avec remarque',
      failed: 'Non terminé',
      not_requested: 'Non requis',
    },
  },
  es: {
    inProgressTitle: 'Preparando al alumno',
    completeTitle: 'Preparación del alumno completada',
    reviewTitle: 'Preparación completada con observaciones',
    description: 'La inscripción ha terminado. Puede seguir trabajando mientras se completan la clase, la cuenta y las cuotas escolares.',
    checking: 'Comprobando el progreso…',
    loadFailed: 'El progreso de la preparación no está disponible temporalmente.',
    stillWorking: 'La preparación tarda más de lo habitual. Puede seguir trabajando o volver a comprobar.',
    retry: 'Volver a comprobar',
    progressLabel: 'Progreso de preparación del alumno',
    unknownStep: 'Paso de preparación',
    stepLabels: {
      class_assignment: 'Asignación de clase',
      account: 'Cuenta del alumno',
      financial_plan: 'Cuotas escolares',
    },
    statusLabels: {
      pending: 'En curso',
      completed: 'Completado',
      unavailable: 'No disponible',
      ambiguous: 'Requiere revisión',
      warning: 'Completado con observación',
      failed: 'No se pudo completar',
      not_requested: 'No requerido',
    },
  },
};

export function getStudentPostSetupCopy(locale: Locale): StudentPostSetupCopy {
  return COPY[locale];
}
