import type { Locale } from './config';
import { FRENCH_VALUE_REPLACEMENTS } from './fr-value-replacements';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import fr from '../../../messages/fr.json';

export type Messages = typeof en;

export const MESSAGES: Record<Locale, Messages> = { ar, en, fr, es };

const INLINE_MESSAGES: Record<Locale, Record<string, string>> = {
  ar: {
    'nav.library': 'المكتبة',
    'nav.entryRequirements': 'تجهيزات الدخول المدرسي',
    'nav.curriculumRequirements': 'المقرر والتجهيزات',
    'common.more': 'المزيد',
    'admin.createClass': 'إضافة قسم',
    'admin.academicSetup.warnings.teacher_target_hours_exceeded': 'تجاوز الأستاذ عدد الساعات المستهدف',
    'admin.academicSetup.warnings.teacher_subject_eligibility_unspecified': 'لم يتم تحديد أهلية الأستاذ لتدريس هذه المادة',
    'admin.academicSetup.warnings.weekly_load_target_exceeded': 'سيؤدي هذا الإسناد إلى تجاوز الحمولة الأسبوعية المستهدفة',
    'admin.academicSetup.teacherOnlyNoAdminRole': 'أستاذ فقط — بدون دور إداري',
    'admin.academicSetup.teacherOnlyNoAdminRoleHint': 'سيُزال الدور والصلاحيات الإدارية، مع الإبقاء على ملف الأستاذ وإسناداته.',
    'admin.academicSetup.teacherAssignmentMatrix.selectAllAvailable': 'تحديد كل المتاح',
    'admin.academicSetup.teacherAssignmentMatrix.clearVisible': 'إلغاء تحديد المعروض',
    'admin.academicSetup.teacherAssignmentMatrix.occupiedBy': 'مسند إلى: {name}',
    'admin.academicSetup.teacherAssignmentMatrix.selectionSummary': 'المحدد {selected} من {total} · غير متاح {blocked}',
    'admin.academicSetup.teacherAssignmentMatrix.chooseSubjects': 'اختر مادة واحدة أو أكثر لتظهر أقسام المستوى.',
    'admin.academicSetup.teacherAssignmentMatrix.noSubjects': 'لا توجد مواد مفعلة لهذا المستوى.',
    'admin.academicSetup.teacherAssignmentMatrix.occupancyUnavailable': 'تعذر التحقق من الإسنادات الحالية؛ تم إيقاف الاختيار مؤقتًا لتجنب التعارض.',
    'admin.academicSetup.teacherAssignmentMatrix.subjectsHint': 'اختر السلك والمستوى، ثم أضف عدة مواد بسرعة وحدد الأقسام المطلوبة.',
    'admin.academicSetup.teacherAssignmentMatrix.selected': 'محدد',
    'admin.academicSetup.teacherAssignmentMatrix.available': 'متاح',
    'admin.studentsList.serviceCategory.registration': 'التسجيل',
    'admin.studentsList.serviceCategory.tuition': 'التمدرس',
    'admin.studentsList.serviceCategory.transport': 'النقل',
    'admin.studentsList.serviceCategory.canteen': 'المطعم',
    'admin.studentsList.serviceCategory.meals': 'الوجبات',
    'admin.studentsList.serviceCategory.activities': 'الأنشطة',
    'admin.studentsList.serviceCategory.activity': 'نشاط',
    'admin.studentsList.serviceCategory.books': 'الكتب',
    'admin.studentsList.serviceCategory.other': 'خدمة أخرى',
    'admin.director.financeTitle': 'المالية والتحصيل',
    'admin.director.financeDesc': 'تحصيل اليوم وهذا الشهر، مع المتبقي والمتأخرات.',
    'admin.director.financeCollectionsGroup': 'التحصيل',
    'admin.director.financePositionGroup': 'الوضع المالي',
    'admin.director.financeCollectedToday': 'محصل اليوم',
    'admin.director.financeCollectedMonth': 'محصل هذا الشهر',
    'admin.pedagogicalDashboard.dailyPulseTitle': 'نبض اليوم',
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'منشورة: {count}',
    'admin.pedagogicalDashboard.readMessages': 'قراءة الرسائل',
    'admin.pedagogicalDashboard.unreadMessages': 'رسائل غير مقروءة',
    'admin.pedagogicalDashboard.pendingReview': 'بانتظار المراجعة',
    'admin.pedagogicalDashboard.reviewMessages': 'مراجعة الرسائل',
    'admin.pedagogicalDashboard.reviewHomeworks': 'مراجعة الواجبات',
    'admin.pedagogicalDashboard.viewHomeworks': 'عرض الواجبات',
    'admin.pedagogicalDashboard.published': 'منشورة',
  },
  en: {
    'nav.library': 'Library',
    'nav.entryRequirements': 'School entry requirements',
    'nav.curriculumRequirements': 'Curriculum & requirements',
    'common.more': 'More',
    'admin.createClass': 'Add class',
    'admin.academicSetup.warnings.teacher_target_hours_exceeded': "The teacher's target hours have been exceeded.",
    'admin.academicSetup.warnings.teacher_subject_eligibility_unspecified': "The teacher's eligibility for this subject has not been specified.",
    'admin.academicSetup.warnings.weekly_load_target_exceeded': 'This assignment exceeds the target weekly workload.',
    'admin.academicSetup.teacherOnlyNoAdminRole': 'Teacher only — no administrative role',
    'admin.academicSetup.teacherOnlyNoAdminRoleHint': 'The administrative role and permissions will be removed while the teacher profile and teaching assignments are preserved.',
    'admin.academicSetup.teacherAssignmentMatrix.selectAllAvailable': 'Select all available',
    'admin.academicSetup.teacherAssignmentMatrix.clearVisible': 'Clear visible selection',
    'admin.academicSetup.teacherAssignmentMatrix.occupiedBy': 'Assigned to: {name}',
    'admin.academicSetup.teacherAssignmentMatrix.selectionSummary': '{selected} of {total} selected · {blocked} unavailable',
    'admin.academicSetup.teacherAssignmentMatrix.chooseSubjects': 'Choose one or more subjects to show the classes for this level.',
    'admin.academicSetup.teacherAssignmentMatrix.noSubjects': 'No enabled subjects are available for this level.',
    'admin.academicSetup.teacherAssignmentMatrix.occupancyUnavailable': 'Current assignments could not be verified, so selection is temporarily disabled to avoid conflicts.',
    'admin.academicSetup.teacherAssignmentMatrix.subjectsHint': 'Choose cycle and level, add multiple subjects quickly, then select the required classes.',
    'admin.academicSetup.teacherAssignmentMatrix.selected': 'Selected',
    'admin.academicSetup.teacherAssignmentMatrix.available': 'Available',
    'admin.studentsList.serviceCategory.registration': 'Registration',
    'admin.studentsList.serviceCategory.tuition': 'Tuition',
    'admin.studentsList.serviceCategory.transport': 'Transport',
    'admin.studentsList.serviceCategory.canteen': 'Canteen',
    'admin.studentsList.serviceCategory.meals': 'Meals',
    'admin.studentsList.serviceCategory.activities': 'Activities',
    'admin.studentsList.serviceCategory.activity': 'Activity',
    'admin.studentsList.serviceCategory.books': 'Books',
    'admin.studentsList.serviceCategory.other': 'Other service',
    'admin.director.financeTitle': 'Finance & collections',
    'admin.director.financeDesc': 'Collections today and this month, with remaining and overdue balances.',
    'admin.director.financeCollectionsGroup': 'Collections',
    'admin.director.financePositionGroup': 'Financial position',
    'admin.director.financeCollectedToday': 'Collected today',
    'admin.director.financeCollectedMonth': 'Collected this month',
    'admin.pedagogicalDashboard.dailyPulseTitle': "Today's pulse",
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'Published: {count}',
    'admin.pedagogicalDashboard.readMessages': 'Read messages',
    'admin.pedagogicalDashboard.unreadMessages': 'Unread messages',
    'admin.pedagogicalDashboard.pendingReview': 'Pending review',
    'admin.pedagogicalDashboard.reviewMessages': 'Review messages',
    'admin.pedagogicalDashboard.reviewHomeworks': 'Review homework',
    'admin.pedagogicalDashboard.viewHomeworks': 'View homework',
    'admin.pedagogicalDashboard.published': 'Published',
  },
  fr: {
    'nav.library': 'Bibliothèque',
    'nav.entryRequirements': 'Fournitures de rentrée',
    'nav.curriculumRequirements': 'Programme et fournitures',
    'common.more': 'Plus',
    'admin.createClass': 'Ajouter une classe',
    'admin.academicSetup.warnings.teacher_target_hours_exceeded': "Le volume horaire cible de l’enseignant est dépassé.",
    'admin.academicSetup.warnings.teacher_subject_eligibility_unspecified': "L’éligibilité de l’enseignant pour cette matière n’est pas définie.",
    'admin.academicSetup.warnings.weekly_load_target_exceeded': 'Cette affectation dépasse la charge hebdomadaire cible.',
    'admin.academicSetup.teacherOnlyNoAdminRole': 'Enseignant uniquement — sans rôle administratif',
    'admin.academicSetup.teacherOnlyNoAdminRoleHint': 'Le rôle et les droits administratifs seront supprimés, tout en conservant le profil enseignant et ses affectations.',
    'admin.academicSetup.teacherAssignmentMatrix.selectAllAvailable': 'Sélectionner tout ce qui est disponible',
    'admin.academicSetup.teacherAssignmentMatrix.clearVisible': 'Effacer la sélection affichée',
    'admin.academicSetup.teacherAssignmentMatrix.occupiedBy': 'Affecté à : {name}',
    'admin.academicSetup.teacherAssignmentMatrix.selectionSummary': '{selected} sur {total} sélectionnés · {blocked} indisponibles',
    'admin.academicSetup.teacherAssignmentMatrix.chooseSubjects': 'Choisissez une ou plusieurs matières pour afficher les classes de ce niveau.',
    'admin.academicSetup.teacherAssignmentMatrix.noSubjects': 'Aucune matière active pour ce niveau.',
    'admin.academicSetup.teacherAssignmentMatrix.occupancyUnavailable': 'Les affectations actuelles n’ont pas pu être vérifiées ; la sélection est temporairement désactivée pour éviter les conflits.',
    'admin.academicSetup.teacherAssignmentMatrix.subjectsHint': 'Choisissez le cycle et le niveau, ajoutez plusieurs matières rapidement, puis sélectionnez les classes.',
    'admin.academicSetup.teacherAssignmentMatrix.selected': 'Sélectionné',
    'admin.academicSetup.teacherAssignmentMatrix.available': 'Disponible',
    'admin.academicSetup.guided.category.middle_school': 'Collège',
    'admin.academicSetup.guided.category.secondary': 'Lycée',
    'admin.academicSetup.guided.category.high_school': 'Lycée',
    'admin.studentsList.serviceCategory.registration': 'Inscription',
    'admin.studentsList.serviceCategory.tuition': 'Scolarité',
    'admin.studentsList.serviceCategory.transport': 'Transport',
    'admin.studentsList.serviceCategory.canteen': 'Cantine',
    'admin.studentsList.serviceCategory.meals': 'Repas',
    'admin.studentsList.serviceCategory.activities': 'Activités',
    'admin.studentsList.serviceCategory.activity': 'Activité',
    'admin.studentsList.serviceCategory.books': 'Livres',
    'admin.studentsList.serviceCategory.other': 'Autre service',
    'admin.director.financeTitle': 'Finances et encaissements',
    'admin.director.financeDesc': 'Encaissements du jour et du mois, avec le restant et les impayés.',
    'admin.director.financeCollectionsGroup': 'Encaissements',
    'admin.director.financePositionGroup': 'Situation financière',
    'admin.director.financeCollectedToday': "Encaissé aujourd'hui",
    'admin.director.financeCollectedMonth': 'Encaissé ce mois',
    'admin.pedagogicalDashboard.dailyPulseTitle': 'Le pouls du jour',
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'Publiés : {count}',
    'admin.pedagogicalDashboard.readMessages': 'Lire les messages',
    'admin.pedagogicalDashboard.unreadMessages': 'Messages non lus',
    'admin.pedagogicalDashboard.pendingReview': 'En attente de révision',
    'admin.pedagogicalDashboard.reviewMessages': 'Réviser les messages',
    'admin.pedagogicalDashboard.reviewHomeworks': 'Réviser les devoirs',
    'admin.pedagogicalDashboard.viewHomeworks': 'Voir les devoirs',
    'admin.pedagogicalDashboard.published': 'Publiés',
  },
  es: {
    'nav.library': 'Biblioteca',
    'nav.entryRequirements': 'Material escolar',
    'nav.curriculumRequirements': 'Currículo y materiales',
    'common.more': 'Más',
    'admin.createClass': 'Añadir clase',
    'admin.academicSetup.warnings.teacher_target_hours_exceeded': 'Se han superado las horas objetivo del profesor.',
    'admin.academicSetup.warnings.teacher_subject_eligibility_unspecified': 'No se ha especificado la elegibilidad del profesor para esta materia.',
    'admin.academicSetup.warnings.weekly_load_target_exceeded': 'Esta asignación supera la carga semanal objetivo.',
    'admin.academicSetup.teacherOnlyNoAdminRole': 'Solo profesor — sin rol administrativo',
    'admin.academicSetup.teacherOnlyNoAdminRoleHint': 'Se eliminarán el rol y los permisos administrativos, conservando el perfil docente y sus asignaciones.',
    'admin.academicSetup.teacherAssignmentMatrix.selectAllAvailable': 'Seleccionar todo lo disponible',
    'admin.academicSetup.teacherAssignmentMatrix.clearVisible': 'Limpiar la selección visible',
    'admin.academicSetup.teacherAssignmentMatrix.occupiedBy': 'Asignado a: {name}',
    'admin.academicSetup.teacherAssignmentMatrix.selectionSummary': '{selected} de {total} seleccionados · {blocked} no disponibles',
    'admin.academicSetup.teacherAssignmentMatrix.chooseSubjects': 'Elija una o más materias para mostrar las clases de este nivel.',
    'admin.academicSetup.teacherAssignmentMatrix.noSubjects': 'No hay materias activas para este nivel.',
    'admin.academicSetup.teacherAssignmentMatrix.occupancyUnavailable': 'No se pudieron verificar las asignaciones actuales; la selección se desactiva temporalmente para evitar conflictos.',
    'admin.academicSetup.teacherAssignmentMatrix.subjectsHint': 'Elija ciclo y nivel, añada varias materias rápidamente y luego seleccione las clases.',
    'admin.academicSetup.teacherAssignmentMatrix.selected': 'Seleccionado',
    'admin.academicSetup.teacherAssignmentMatrix.available': 'Disponible',
    'admin.studentsList.serviceCategory.registration': 'Matrícula',
    'admin.studentsList.serviceCategory.tuition': 'Escolaridad',
    'admin.studentsList.serviceCategory.transport': 'Transporte',
    'admin.studentsList.serviceCategory.canteen': 'Comedor',
    'admin.studentsList.serviceCategory.meals': 'Comidas',
    'admin.studentsList.serviceCategory.activities': 'Actividades',
    'admin.studentsList.serviceCategory.activity': 'Actividad',
    'admin.studentsList.serviceCategory.books': 'Libros',
    'admin.studentsList.serviceCategory.other': 'Otro servicio',
    'admin.director.financeTitle': 'Finanzas y cobros',
    'admin.director.financeDesc': 'Cobros de hoy y de este mes, junto con el saldo pendiente y los atrasos.',
    'admin.director.financeCollectionsGroup': 'Cobros',
    'admin.director.financePositionGroup': 'Situación financiera',
    'admin.director.financeCollectedToday': 'Cobrado hoy',
    'admin.director.financeCollectedMonth': 'Cobrado este mes',
    'admin.pedagogicalDashboard.dailyPulseTitle': 'Pulso de hoy',
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'Publicadas: {count}',
    'admin.pedagogicalDashboard.readMessages': 'Leer los mensajes',
    'admin.pedagogicalDashboard.unreadMessages': 'Mensajes no leídos',
    'admin.pedagogicalDashboard.pendingReview': 'Pendiente de revisión',
    'admin.pedagogicalDashboard.reviewMessages': 'Revisar los mensajes',
    'admin.pedagogicalDashboard.reviewHomeworks': 'Revisar tareas',
    'admin.pedagogicalDashboard.viewHomeworks': 'Ver tareas',
    'admin.pedagogicalDashboard.published': 'Publicadas',
  },
};

export function getMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split('.');
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function normalizeLocalizedUiTerm(locale: Locale, value: string): string {
  if (locale === 'fr') return FRENCH_VALUE_REPLACEMENTS[value] ?? value;
  if (locale !== 'ar') return value;
  if (value === 'عوامل تصفية إضافية') return 'فلاتر أخرى';
  if (value === 'إخفاء عوامل التصفية الإضافية') return 'إخفاء الفلاتر';
  if (value === 'الأسلاك المؤهل لها') return 'السلك';
  if (value === 'المستويات المؤهل لها') return 'المستوى';
  return value;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = normalizeLocalizedUiTerm(
    locale,
    getMessage(MESSAGES[locale], key) ??
      INLINE_MESSAGES[locale][key] ??
      getMessage(MESSAGES.en, key) ??
      INLINE_MESSAGES.en[key] ??
      key,
  );
  if (!params) return raw;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    raw,
  );
}
