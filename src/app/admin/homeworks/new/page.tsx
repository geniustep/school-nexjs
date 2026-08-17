'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status review-needed
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Badge, Card, InfoBanner, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { SecureMaterialsComposer } from '@/features/attachments/secure-materials/secure-materials-composer';
import { useSecureMaterials } from '@/features/attachments/secure-materials/use-secure-materials';
import {
  createIdempotencyKey,
  finalizeUploadSession,
} from '@/features/attachments/secure-materials/api';
import { useAcademicContextOptions } from '@/features/academic-context/hooks/use-academic-context-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { EffectiveSubjectOption } from '@/types/academic-context';
import type { SchoolClass } from '@/types/class';
import {
  buildHomeworkCreateRequest,
  buildHomeworkFinalizeRequest,
  type HomeworkCreateTarget,
} from '@/features/admin/homeworks/utils/homework-create-request';
import '@/features/admin/homeworks/homework-create.css';

const OPTIONS_QUERY = { page_size: 500 } as const;

type SubjectChoice = Pick<EffectiveSubjectOption, 'id' | 'name'>;

type AssignmentPreview = {
  classItem: SchoolClass;
  assignment: TeachingAssignment | null;
  status: 'ready' | 'missing' | 'ambiguous';
};

const COPY = {
  ar: {
    title: 'إضافة واجب',
    subtitle: 'حدد الأقسام والمادة، اكتب الواجب، ثم راجع المستلمين قبل الإرسال.',
    back: 'العودة إلى الواجبات',
    audience: 'لمن سيُرسل الواجب؟',
    audienceHint: 'ابدأ بالسلك ثم المستوى، ثم اختر قسمًا واحدًا أو أي مجموعة من الأقسام.',
    cycle: 'السلك',
    level: 'المستوى',
    section: 'القسم',
    subject: 'المادة',
    allSections: 'كل أقسام المستوى',
    sections: 'الأقسام',
    sectionsHint: 'اختر الأقسام التي سيصل إليها الواجب. يمكنك اختيار قسمين أو أكثر بشكل مستقل.',
    selectAll: 'تحديد الكل',
    clearSelection: 'إلغاء التحديد',
    selectedCount: 'المحدد',
    attachments: 'المرفقات',
    details: 'محتوى الواجب',
    detailsHint: 'اكتب عنوانًا واضحًا وتعليمات مختصرة، ثم حدد آخر أجل للتسليم.',
    homeworkTitle: 'عنوان الواجب',
    description: 'التعليمات والمحتوى',
    summary: 'ملخص الإرسال',
    visibility: 'الظهور والتسليم',
    visibleStudent: 'ظاهر للتلميذ',
    visibleParent: 'ظاهر لولي الأمر',
    requireSubmission: 'يتطلب تسليمًا من التلميذ',
    preview: 'الأقسام والأساتذة',
    previewHint: 'يجب أن يكون لكل قسم أستاذ رئيسي واحد للمادة قبل الإرسال.',
    teacherReady: 'جاهز',
    teacherMissing: 'لا يوجد أستاذ رئيسي للمادة',
    teacherAmbiguous: 'يوجد أكثر من أستاذ رئيسي؛ يلزم تصحيح الإسناد',
    noClasses: 'لا توجد أقسام في هذا المستوى خلال السنة الدراسية المحددة.',
    noSubjects: 'لا توجد مادة مشتركة متاحة للأقسام المختارة.',
    send: 'إرسال الواجب',
    sending: 'جارٍ الإرسال…',
    sent: 'تم إنشاء الواجب بنجاح.',
    selectCycle: 'اختر السلك',
    selectLevel: 'اختر المستوى',
    selectSection: 'اختر القسم',
    selectSubject: 'اختر المادة',
    refreshingContext: 'جارٍ تحديث الخيارات وفق الاختيار…',
    loadFailed: 'تعذر تحميل بيانات إعداد الواجب.',
    assignmentLoadFailed: 'تعذر التحقق من إسنادات الأساتذة.',
    fixAssignments: 'أكمل إسنادات الأساتذة قبل الإرسال.',
    invalidForm: 'تحقق من بيانات الواجب قبل الإرسال.',
    notSelected: 'لم يُحدد بعد',
    selectedSections: 'الأقسام المستهدفة',
    readyTeachers: 'الأساتذة الجاهزون',
    readyToSend: 'الواجب جاهز للإرسال.',
    completeRequired: 'أكمل الحقول المطلوبة وإسنادات الأساتذة لتفعيل الإرسال.',
    stepOne: '1',
    stepTwo: '2',
  },
  fr: {
    title: 'Ajouter un devoir',
    subtitle: 'Choisissez les classes et la matière, rédigez le devoir puis vérifiez les destinataires.',
    back: 'Retour aux devoirs',
    audience: 'À qui envoyer le devoir ?',
    audienceHint: 'Commencez par le cycle puis le niveau, puis choisissez une ou plusieurs classes.',
    cycle: 'Cycle',
    level: 'Niveau',
    section: 'Classe',
    subject: 'Matière',
    allSections: 'Toutes les classes du niveau',
    sections: 'Classes',
    sectionsHint: 'Sélectionnez librement une ou plusieurs classes destinataires.',
    selectAll: 'Tout sélectionner',
    clearSelection: 'Effacer',
    selectedCount: 'Sélectionnées',
    attachments: 'Pièces jointes',
    details: 'Contenu du devoir',
    detailsHint: 'Ajoutez un titre clair, des consignes concises et une date limite.',
    homeworkTitle: 'Titre du devoir',
    description: 'Consignes et contenu',
    summary: "Résumé de l'envoi",
    visibility: 'Visibilité et remise',
    visibleStudent: "Visible pour l'élève",
    visibleParent: 'Visible pour le parent',
    requireSubmission: "Remise de l'élève requise",
    preview: 'Classes et enseignants',
    previewHint: 'Chaque classe doit avoir exactement un enseignant principal pour la matière.',
    teacherReady: 'Prêt',
    teacherMissing: 'Aucun enseignant principal pour cette matière',
    teacherAmbiguous: "Plusieurs enseignants principaux ; l'affectation doit être corrigée",
    noClasses: 'Aucune classe pour ce niveau dans l’année scolaire sélectionnée.',
    noSubjects: 'Aucune matière commune disponible pour les classes sélectionnées.',
    send: 'Envoyer le devoir',
    sending: 'Envoi…',
    sent: 'Le devoir a été créé avec succès.',
    selectCycle: 'Choisir le cycle',
    selectLevel: 'Choisir le niveau',
    selectSection: 'Choisir la classe',
    selectSubject: 'Choisir la matière',
    refreshingContext: 'Mise à jour des options selon votre sélection…',
    loadFailed: 'Impossible de charger les données du devoir.',
    assignmentLoadFailed: 'Impossible de vérifier les affectations des enseignants.',
    fixAssignments: 'Complétez les affectations des enseignants avant l’envoi.',
    invalidForm: 'Vérifiez les données du devoir avant l’envoi.',
    notSelected: 'Non défini',
    selectedSections: 'Classes ciblées',
    readyTeachers: 'Enseignants prêts',
    readyToSend: 'Le devoir est prêt à être envoyé.',
    completeRequired: "Complétez les champs requis et les affectations pour activer l'envoi.",
    stepOne: '1',
    stepTwo: '2',
  },
  en: {
    title: 'Add homework',
    subtitle: 'Choose the classes and subject, write the homework, then review recipients before sending.',
    back: 'Back to homework',
    audience: 'Who should receive it?',
    audienceHint: 'Start with cycle and level, then choose one or any combination of classes.',
    cycle: 'Cycle',
    level: 'Level',
    section: 'Class',
    subject: 'Subject',
    allSections: 'All classes in the level',
    sections: 'Classes',
    sectionsHint: 'Select one or any combination of target classes.',
    selectAll: 'Select all',
    clearSelection: 'Clear',
    selectedCount: 'Selected',
    attachments: 'Attachments',
    details: 'Homework content',
    detailsHint: 'Add a clear title, concise instructions, and a deadline.',
    homeworkTitle: 'Homework title',
    description: 'Instructions and content',
    summary: 'Delivery summary',
    visibility: 'Visibility and submission',
    visibleStudent: 'Visible to student',
    visibleParent: 'Visible to parent',
    requireSubmission: 'Student submission required',
    preview: 'Classes and teachers',
    previewHint: 'Every class must have exactly one main teacher for the subject before sending.',
    teacherReady: 'Ready',
    teacherMissing: 'No main teacher is assigned for this subject',
    teacherAmbiguous: 'More than one main teacher is assigned; fix the assignment first',
    noClasses: 'No classes exist for this level in the selected academic year.',
    noSubjects: 'No common subject is available for the selected classes.',
    send: 'Send homework',
    sending: 'Sending…',
    sent: 'Homework created successfully.',
    selectCycle: 'Select cycle',
    selectLevel: 'Select level',
    selectSection: 'Select class',
    selectSubject: 'Select subject',
    refreshingContext: 'Updating options for your selection…',
    loadFailed: 'Could not load homework setup data.',
    assignmentLoadFailed: 'Could not verify teacher assignments.',
    fixAssignments: 'Complete teacher assignments before sending.',
    invalidForm: 'Check the homework details before sending.',
    notSelected: 'Not selected',
    selectedSections: 'Target classes',
    readyTeachers: 'Ready teachers',
    readyToSend: 'Homework is ready to send.',
    completeRequired: 'Complete required fields and teacher assignments to enable sending.',
    stepOne: '1',
    stepTwo: '2',
  },
  es: {
    title: 'Añadir tarea',
    subtitle: 'Elige las clases y la materia, redacta la tarea y revisa los destinatarios antes de enviarla.',
    back: 'Volver a tareas',
    audience: '¿A quién se enviará?',
    audienceHint: 'Empieza por ciclo y nivel y luego elige una o varias clases.',
    cycle: 'Ciclo',
    level: 'Nivel',
    section: 'Clase',
    subject: 'Materia',
    allSections: 'Todas las clases del nivel',
    sections: 'Clases',
    sectionsHint: 'Selecciona libremente una o varias clases destinatarias.',
    selectAll: 'Seleccionar todas',
    clearSelection: 'Limpiar',
    selectedCount: 'Seleccionadas',
    attachments: 'Adjuntos',
    details: 'Contenido de la tarea',
    detailsHint: 'Añade un título claro, instrucciones breves y una fecha límite.',
    homeworkTitle: 'Título de la tarea',
    description: 'Instrucciones y contenido',
    summary: 'Resumen del envío',
    visibility: 'Visibilidad y entrega',
    visibleStudent: 'Visible para el alumno',
    visibleParent: 'Visible para el padre/madre',
    requireSubmission: 'Requiere entrega del alumno',
    preview: 'Clases y profesores',
    previewHint: 'Cada clase debe tener exactamente un profesor principal para la materia.',
    teacherReady: 'Listo',
    teacherMissing: 'No hay profesor principal asignado para esta materia',
    teacherAmbiguous: 'Hay más de un profesor principal; corrige la asignación',
    noClasses: 'No hay clases para este nivel en el curso seleccionado.',
    noSubjects: 'No hay una materia común disponible para las clases seleccionadas.',
    send: 'Enviar tarea',
    sending: 'Enviando…',
    sent: 'La tarea se creó correctamente.',
    selectCycle: 'Seleccionar ciclo',
    selectLevel: 'Seleccionar nivel',
    selectSection: 'Seleccionar clase',
    selectSubject: 'Seleccionar materia',
    refreshingContext: 'Actualizando las opciones según tu selección…',
    loadFailed: 'No se pudieron cargar los datos de la tarea.',
    assignmentLoadFailed: 'No se pudieron verificar las asignaciones de profesores.',
    fixAssignments: 'Completa las asignaciones de profesores antes de enviar.',
    invalidForm: 'Revisa los datos de la tarea antes de enviarla.',
    notSelected: 'Sin seleccionar',
    selectedSections: 'Clases destinatarias',
    readyTeachers: 'Profesores listos',
    readyToSend: 'La tarea está lista para enviarse.',
    completeRequired: 'Completa los campos obligatorios y las asignaciones para habilitar el envío.',
    stepOne: '1',
    stepTwo: '2',
  },
} as const;

function commonSubjects(
  classes: SchoolClass[],
  contextSubjects: EffectiveSubjectOption[],
): SubjectChoice[] {
  if (classes.length === 0) return [];

  const classSubjectLists = classes.map((item) => item.subjects ?? []);
  if (classSubjectLists.every((items) => items.length > 0)) {
    const first = classSubjectLists[0];
    return first
      .filter((subject) =>
        classSubjectLists.every((items) =>
          items.some((candidate) => candidate.id === subject.id),
        ),
      )
      .map((subject) => ({ id: subject.id, name: subject.name }));
  }

  return contextSubjects.map((subject) => ({ id: subject.id, name: subject.name }));
}

export default function AdminHomeworkCreatePage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { locale } = useLocale();
  const copy = COPY[locale];
  const { activeAcademicYearId, academicYearError } = useAdminSession();

  const classesState = useGlobalAcademicYearResource<SchoolClass[]>(
    endpoints.admin.classes,
    OPTIONS_QUERY,
  );
  const academicContext = useAcademicContextOptions({
    audience: 'admin',
    enabled: activeAcademicYearId != null,
  });

  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [visibleToStudent, setVisibleToStudent] = useState(true);
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [requireSubmission, setRequireSubmission] = useState(true);
  const [saving, setSaving] = useState(false);
  const materials = useSecureMaterials({ purpose: 'homework' });
  const finalizeKeyRef = useRef(createIdempotencyKey('admin-homework-finalize'));

  const cycleId = academicContext.selection.cycleId;
  const levelId = academicContext.selection.levelId;
  const subjectId = academicContext.selection.subjectId;
  const cycles = academicContext.options?.cycles ?? [];
  const levels = academicContext.options?.levels ?? [];
  const contextSubjects = academicContext.options?.subjects ?? [];
  const classes = classesState.data ?? [];

  const levelClasses = useMemo(() => {
    if (!levelId) return [];
    return classes
      .filter((item) => item.level?.id === Number(levelId))
      .sort((a, b) => (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name));
  }, [classes, levelId]);

  useEffect(() => {
    setSelectedClassIds((current) => {
      const allowed = new Set(levelClasses.map((item) => item.id));
      const next = current.filter((id) => allowed.has(id));
      return next.length === current.length && next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [levelClasses]);

  const selectedClasses = useMemo(() => {
    const selected = new Set(selectedClassIds);
    return levelClasses.filter((item) => selected.has(item.id));
  }, [levelClasses, selectedClassIds]);

  const availableSubjects = useMemo(
    () => commonSubjects(selectedClasses, contextSubjects),
    [contextSubjects, selectedClasses],
  );

  const assignmentQuery = useMemo(
    () =>
      activeAcademicYearId && subjectId
        ? {
            academic_year_id: activeAcademicYearId,
            subject_id: Number(subjectId),
            limit: 200,
          }
        : undefined,
    [activeAcademicYearId, subjectId],
  );

  const assignmentsState = useAdminResource<TeachingAssignment[]>(
    assignmentQuery ? endpoints.admin.teachingAssignments : null,
    assignmentQuery,
  );

  const previews = useMemo<AssignmentPreview[]>(() => {
    if (!subjectId || assignmentsState.loading) return [];
    const selectedSubjectId = Number(subjectId);
    const assignments = assignmentsState.data ?? [];

    return selectedClasses.map((classItem) => {
      const main = assignments.filter(
        (assignment) =>
          assignment.class.id === classItem.id &&
          assignment.subject.id === selectedSubjectId &&
          assignment.active &&
          assignment.role === 'main',
      );

      if (main.length === 1) return { classItem, assignment: main[0], status: 'ready' };
      if (main.length === 0) return { classItem, assignment: null, status: 'missing' };
      return { classItem, assignment: null, status: 'ambiguous' };
    });
  }, [assignmentsState.data, assignmentsState.loading, selectedClasses, subjectId]);

  const assignmentsReady =
    previews.length > 0 && previews.every((item) => item.status === 'ready');
  const readyTeacherCount = previews.filter((item) => item.status === 'ready').length;

  const formReady =
    activeAcademicYearId != null &&
    Boolean(cycleId) &&
    Boolean(levelId) &&
    selectedClasses.length > 0 &&
    Boolean(subjectId) &&
    Boolean(name.trim()) &&
    Boolean(deadline) &&
    assignmentsReady &&
    !academicContext.refetching &&
    !assignmentsState.loading &&
    materials.ready &&
    !saving;

  const selectedCycle = cycles.find((item) => String(item.id) === cycleId);
  const selectedLevel = levels.find((item) => String(item.id) === levelId);
  const selectedSubject = availableSubjects.find((item) => String(item.id) === subjectId);
  const selectedClassLabel =
    selectedClasses.length === 0
      ? copy.notSelected
      : selectedClasses.length === levelClasses.length
        ? `${copy.allSections} · ${selectedClasses.length}`
        : selectedClasses.length === 1
          ? selectedClasses[0]?.display_name ?? selectedClasses[0]?.name ?? copy.notSelected
          : `${selectedClasses.length} · ${selectedClasses
              .map((item) => item.display_name ?? item.name)
              .join('، ')}`;

  const loadErrorMessage =
    classesState.error?.message ??
    academicContext.error?.message ??
    academicYearError?.message ??
    (academicContext.permissionDenied ? copy.loadFailed : null);

  function handleCycleChange(nextCycleId: string) {
    setSelectedClassIds([]);
    academicContext.setField('cycle', nextCycleId);
  }

  function handleLevelChange(nextLevelId: string) {
    setSelectedClassIds([]);
    academicContext.setField('level', nextLevelId);
  }

  function applyClassSelection(nextIds: number[]) {
    const requested = new Set(nextIds);
    const normalized = levelClasses
      .filter((item) => requested.has(item.id))
      .map((item) => item.id);
    setSelectedClassIds(normalized);

    if (subjectId) {
      const nextClasses = levelClasses.filter((item) => requested.has(item.id));
      const nextSubjects = commonSubjects(nextClasses, contextSubjects);
      if (!nextSubjects.some((subject) => String(subject.id) === subjectId)) {
        academicContext.setField('subject', '');
      }
    }
  }

  function toggleClass(classId: number, checked: boolean) {
    const next = checked
      ? [...selectedClassIds, classId]
      : selectedClassIds.filter((id) => id !== classId);
    applyClassSelection(next);
  }

  async function handleCancel() {
    await materials.cancel();
    router.push('/admin/homeworks');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formReady || activeAcademicYearId == null) {
      if (!assignmentsReady && subjectId) toast.error(copy.fixAssignments);
      return;
    }

    const targets: HomeworkCreateTarget[] = previews.map((preview) => ({
      class_id: preview.classItem.id,
      teacher_id: preview.assignment!.teacher.id,
    }));

    const fields = {
      name,
      description,
      subject_id: Number(subjectId),
      academic_year_id: activeAcademicYearId,
      deadline,
      visible_to_student: visibleToStudent,
      visible_to_parent: visibleToParent,
      require_submission: requireSubmission,
    };

    setSaving(true);
    let response;
    try {
      const useUploadFinalize = materials.materials.length > 0 || materials.session != null;
      if (useUploadFinalize) {
        const session = await materials.ensureSession();
        const request = buildHomeworkFinalizeRequest(session.publicId, fields, targets);
        response = await finalizeUploadSession<unknown>({
          path: request.path,
          session,
          idempotencyKey: finalizeKeyRef.current,
          body: request.body,
        });
      } else {
        const request = buildHomeworkCreateRequest(fields, targets);
        response = await api.post<unknown>(request.path, request.body);
      }
    } catch (cause) {
      setSaving(false);
      toast.error(cause instanceof Error ? cause.message : copy.invalidForm);
      return;
    }
    setSaving(false);

    if (!response.success) {
      toast.error(response.error.message);
      return;
    }

    toast.success(copy.sent);
    router.push('/admin/homeworks');
    router.refresh();
  }

  if (
    classesState.initialLoading ||
    academicContext.loading ||
    (activeAcademicYearId == null && !academicYearError)
  ) {
    return (
      <div className="admin-workspace homework-create-page">
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <Card className="homework-create__loading-card">
          <span className="spinner" aria-hidden="true" />
          <span>{t('common.loading')}</span>
        </Card>
      </div>
    );
  }

  if (loadErrorMessage) {
    return (
      <div className="admin-workspace homework-create-page">
        <button type="button" className="back-link homework-create__back" onClick={() => void handleCancel()}>
          ‹ {copy.back}
        </button>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <Card>
          <p className="form-error">{loadErrorMessage}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-workspace homework-create-page">
      <button type="button" className="back-link homework-create__back" onClick={() => void handleCancel()}>
        ‹ {copy.back}
      </button>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <form onSubmit={handleSubmit}>
        <div className="homework-create__layout">
          <div className="homework-create__main">
            <Card className="homework-create__section">
              <div className="homework-create__section-head">
                <span className="homework-create__step" aria-hidden="true">{copy.stepOne}</span>
                <div>
                  <h2>{copy.audience}</h2>
                  <p>{copy.audienceHint}</p>
                </div>
              </div>

              <div className="homework-create__scope-grid">
                <label className="field homework-create__field">
                  <span>{copy.cycle}</span>
                  <select
                    className="select"
                    value={cycleId}
                    onChange={(event) => handleCycleChange(event.target.value)}
                  >
                    <option value="">{copy.selectCycle}</option>
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                    ))}
                  </select>
                </label>

                <label className="field homework-create__field">
                  <span >{copy.level}</span>
                  <select
                    className="select"
                    value={levelId}
                    disabled={!cycleId || academicContext.refetching}
                    onChange={(event) => handleLevelChange(event.target.value)}
                  >
                    <option value="">{copy.selectLevel}</option>
                   {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.display_label ?? level.display_name ?? level.name}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset
                  className="homework-create__section-picker"
                  disabled={!levelId || levelClasses.length === 0 || academicContext.refetching}
                >
                  <legend>{copy.sections}</legend>
                  <div className="homework-create__section-picker-head">
                    <p>{copy.sectionsHint}</p>
                    <div className="homework-create__section-picker-tools">
                      <span className="homework-create__selection-count" dir="ltr">
                        {selectedClassIds.length}/{levelClasses.length}
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={levelClasses.length === 0 || selectedClassIds.length === levelClasses.length}
                        onClick={() => applyClassSelection(levelClasses.map((item) => item.id))}
                      >
                        {copy.selectAll}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={selectedClassIds.length === 0}
                        onClick={() => applyClassSelection([])}
                      >
                        {copy.clearSelection}
                      </button>
                    </div>
                  </div>
                  <div className="homework-create__section-options">
                    {levelClasses.map((item) => {
                      const checked = selectedClassIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`homework-create__section-option ${checked ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleClass(item.id, event.target.checked)}
                          />
                          <span dir="auto">{item.display_name ?? item.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="field homework-create__field">
                  <span>{copy.subject}</span>
                  <select
                    className="select"
                    value={subjectId}
                    disabled={
                      selectedClasses.length === 0 ||
                      academicContext.refetching ||
                      availableSubjects.length === 0
                    }
                    onChange={(event) => academicContext.setField('subject', event.target.value)}
                  >
                    <option value="">{copy.selectSubject}</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {academicContext.refetching ? (
                <p className="homework-create__refreshing" role="status">
                  <span className="spinner" aria-hidden="true" />
                  {copy.refreshingContext}
                </p>
              ) : null}

              {levelId && levelClasses.length === 0 ? (
                <InfoBanner title={copy.noClasses} tone="amber" icon="!" />
              ) : null}

              {selectedClasses.length > 0 && availableSubjects.length === 0 && !academicContext.refetching ? (
                <InfoBanner title={copy.noSubjects} tone="amber" icon="!" />
              ) : null}

              {subjectId ? (
                <div className="homework-create__preview">
                  <div className="homework-create__preview-head">
                    <div>
                      <h3>{copy.preview}</h3>
                      <p>{copy.previewHint}</p>
                    </div>
                    <span className="homework-create__preview-count">
                      {readyTeacherCount}/{selectedClasses.length}
                    </span>
                  </div>

                  {assignmentsState.loading ? (
                    <p className="homework-create__refreshing" role="status">
                      <span className="spinner" aria-hidden="true" />
                      {t('common.loading')}
                    </p>
                  ) : assignmentsState.error ? (
                    <p className="form-error">{copy.assignmentLoadFailed}</p>
                  ) : previews.length > 0 ? (
                    <div className="homework-create__teacher-list">
                      {previews.map((preview) => (
                        <div key={preview.classItem.id} className="homework-create__teacher-row">
                          <div className="homework-create__teacher-copy">
                            <strong dir="auto">
                              {preview.classItem.display_name ?? preview.classItem.name}
                            </strong>
                            <span dir="auto">
                              {preview.status === 'ready'
                                ? preview.assignment!.teacher.name
                                : preview.status === 'missing'
                                  ? copy.teacherMissing
                                  : copy.teacherAmbiguous}
                            </span>
                          </div>
                          <Badge
                            tone={
                              preview.status === 'ready'
                                ? 'green'
                                : preview.status === 'missing'
                                  ? 'amber'
                                  : 'red'
                            }
                          >
                            {preview.status === 'ready'
                              ? copy.teacherReady
                              : preview.status === 'missing'
                                ? copy.teacherMissing
                                : copy.teacherAmbiguous}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <Card className="homework-create__section">
              <div className="homework-create__section-head">
                <span className="homework-create__step" aria-hidden="true">{copy.stepTwo}</span>
                <div>
                  <h2>{copy.details}</h2>
                  <p>{copy.detailsHint}</p>
                </div>
              </div>

              <div className="homework-create__details-grid">
                <label className="field homework-create__field homework-create__field--title">
                  <span>{copy.homeworkTitle}</span>
                  <input
                    className="input"
                    value={name}
                    maxLength={180}
                    required
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>

                <label className="field homework-create__field">
                  <span>{t('academic.deadline')}</span>
                  <DatePickerInput value={deadline} onChange={setDeadline} presets={false} />
                </label>
              </div>

              <label className="field homework-create__field homework-create__description">
                <span>{copy.description}</span>
                <textarea
                  className="textarea"
                  rows={8}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div className="homework-create__materials">
                <SecureMaterialsComposer controller={materials} disabled={saving} />
              </div>
            </Card>
          </div>

          <aside className="homework-create__side">
            <Card className="homework-create__summary-card">
              <div className="homework-create__summary-head">
                <h2>{copy.summary}</h2>
                <span className={`homework-create__summary-dot ${formReady ? 'is-ready' : ''}`} aria-hidden="true" />
              </div>

              <dl className="homework-create__summary-list">
                <div>
                  <dt>{copy.cycle}</dt>
                  <dd dir="auto">{selectedCycle?.name ?? copy.notSelected}</dd>
                </div>
                <div>
                  <dt>{copy.level}</dt>
                  <dd dir="auto">
                    {selectedLevel?.display_label ?? selectedLevel?.display_name ?? selectedLevel?.name ?? copy.notSelected}
                  </dd>
                </div>
                <div>
                  <dt>{copy.selectedSections}</dt>
                  <dd dir="auto">{selectedClassLabel}</dd>
                </div>
                <div>
                  <dt>{copy.subject}</dt>
                  <dd dir="auto">{selectedSubject?.name ?? copy.notSelected}</dd>
                </div>
                <div>
                  <dt>{copy.readyTeachers}</dt>
                  <dd className="numeric-text" dir="ltr">
                    {selectedClasses.length > 0 ? `${readyTeacherCount}/${selectedClasses.length}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt>{copy.attachments}</dt>
                  <dd className="numeric-text" dir="ltr">{materials.materials.length}/5</dd>
                </div>
              </dl>

              <div className="homework-create__divider" />

              <div className="homework-create__settings">
                <h3>{copy.visibility}</h3>

                <label className="homework-create__setting">
                  <input
                    type="checkbox"
                    checked={visibleToStudent}
                    onChange={(event) => setVisibleToStudent(event.target.checked)}
                  />
                  <span>{copy.visibleStudent}</span>
                </label>

                <label className="homework-create__setting">
                  <input
                    type="checkbox"
                    checked={visibleToParent}
                    onChange={(event) => setVisibleToParent(event.target.checked)}
                  />
                  <span>{copy.visibleParent}</span>
                </label>

                <label className="homework-create__setting">
                  <input
                    type="checkbox"
                    checked={requireSubmission}
                    onChange={(event) => setRequireSubmission(event.target.checked)}
                  />
                  <span>{copy.requireSubmission}</span>
                </label>
              </div>

              <div className="homework-create__divider" />

              <p className={`homework-create__readiness ${formReady ? 'is-ready' : ''}`} role="status">
                {formReady ? copy.readyToSend : copy.completeRequired}
              </p>

              <div className="homework-create__actions">
                <button type="submit" className="btn btn--primary" disabled={!formReady}>
                  {saving ? copy.sending : copy.send}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => void handleCancel()}>
                  {t('common.cancel')}
                </button>
              </div>
            </Card>
          </aside>
        </div>
      </form>
    </div>
  );
}
