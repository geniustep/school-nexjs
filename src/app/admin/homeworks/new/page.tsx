'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { LevelCycle, SchoolClass, Subject } from '@/types/class';
import {
  buildHomeworkCreateRequest,
  type HomeworkCreateTarget,
} from '@/features/admin/homeworks/utils/homework-create-request';

const OPTIONS_QUERY = { page_size: 500 } as const;

const COPY = {
  ar: {
    title: 'إضافة واجب',
    subtitle: 'أرسل الواجب إلى قسم واحد أو إلى كل أقسام المستوى دفعة واحدة.',
    back: 'العودة إلى الواجبات',
    scope: 'نطاق الإرسال',
    cycle: 'السلك',
    level: 'المستوى',
    section: 'القسم',
    allSections: 'كل أقسام المستوى',
    details: 'محتوى الواجب',
    homeworkTitle: 'عنوان الواجب',
    description: 'التعليمات والمحتوى',
    visibility: 'إعدادات الظهور والتسليم',
    visibleStudent: 'ظاهر للتلميذ',
    visibleParent: 'ظاهر لولي الأمر',
    requireSubmission: 'يتطلب تسليمًا من التلميذ',
    preview: 'معاينة الأقسام والأساتذة',
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
    loadFailed: 'تعذر تحميل بيانات إعداد الواجب.',
    assignmentLoadFailed: 'تعذر التحقق من إسنادات الأساتذة.',
    fixAssignments: 'أكمل إسنادات الأساتذة قبل الإرسال.',
    invalidForm: 'تحقق من بيانات الواجب قبل الإرسال.',
  },
  fr: {
    title: 'Ajouter un devoir',
    subtitle: 'Envoyez le devoir à une classe ou à toutes les classes du niveau en une seule fois.',
    back: 'Retour aux devoirs',
    scope: "Périmètre d'envoi",
    cycle: 'Cycle',
    level: 'Niveau',
    section: 'Classe',
    allSections: 'Toutes les classes du niveau',
    details: 'Contenu du devoir',
    homeworkTitle: 'Titre du devoir',
    description: 'Consignes et contenu',
    visibility: 'Visibilité et remise',
    visibleStudent: "Visible pour l'élève",
    visibleParent: 'Visible pour le parent',
    requireSubmission: "Remise de l'élève requise",
    preview: 'Aperçu des classes et enseignants',
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
    loadFailed: 'Impossible de charger les données du devoir.',
    assignmentLoadFailed: 'Impossible de vérifier les affectations des enseignants.',
    fixAssignments: 'Complétez les affectations des enseignants avant l’envoi.',
    invalidForm: 'Vérifiez les données du devoir avant l’envoi.',
  },
  en: {
    title: 'Add homework',
    subtitle: 'Send the homework to one class or every class in the level in one action.',
    back: 'Back to homework',
    scope: 'Delivery scope',
    cycle: 'Cycle',
    level: 'Level',
    section: 'Class',
    allSections: 'All classes in the level',
    details: 'Homework content',
    homeworkTitle: 'Homework title',
    description: 'Instructions and content',
    visibility: 'Visibility and submission',
    visibleStudent: 'Visible to student',
    visibleParent: 'Visible to parent',
    requireSubmission: 'Student submission required',
    preview: 'Classes and teachers preview',
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
    loadFailed: 'Could not load homework setup data.',
    assignmentLoadFailed: 'Could not verify teacher assignments.',
    fixAssignments: 'Complete teacher assignments before sending.',
    invalidForm: 'Check the homework details before sending.',
  },
  es: {
    title: 'Añadir tarea',
    subtitle: 'Envía la tarea a una clase o a todas las clases del nivel en una sola acción.',
    back: 'Volver a tareas',
    scope: 'Ámbito de envío',
    cycle: 'Ciclo',
    level: 'Nivel',
    section: 'Clase',
    allSections: 'Todas las clases del nivel',
    details: 'Contenido de la tarea',
    homeworkTitle: 'Título de la tarea',
    description: 'Instrucciones y contenido',
    visibility: 'Visibilidad y entrega',
    visibleStudent: 'Visible para el alumno',
    visibleParent: 'Visible para el padre/madre',
    requireSubmission: 'Requiere entrega del alumno',
    preview: 'Vista previa de clases y profesores',
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
    loadFailed: 'No se pudieron cargar los datos de la tarea.',
    assignmentLoadFailed: 'No se pudieron verificar las asignaciones de profesores.',
    fixAssignments: 'Completa las asignaciones de profesores antes de enviar.',
    invalidForm: 'Revisa los datos de la tarea antes de enviarla.',
  },
} as const;

type AssignmentPreview = {
  classItem: SchoolClass;
  assignment: TeachingAssignment | null;
  status: 'ready' | 'missing' | 'ambiguous';
};

function cycleKey(cycle: LevelCycle): string {
  return String(cycle.id);
}

function commonSubjects(classes: SchoolClass[], fallbackSubjects: Subject[], levelId: number | null): Subject[] {
  if (classes.length === 0 || levelId == null) return [];
  const subjectLists = classes.map((item) => item.subjects ?? []);
  if (subjectLists.every((items) => items.length > 0)) {
    const first = subjectLists[0];
    return first.filter((subject) =>
      subjectLists.every((items) => items.some((candidate) => candidate.id === subject.id)),
    );
  }
  return fallbackSubjects.filter(
    (subject) => subject.level_id === levelId || subject.level_ids?.includes(levelId),
  );
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
  const subjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, OPTIONS_QUERY);

  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [classSelection, setClassSelection] = useState('all');
  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [visibleToStudent, setVisibleToStudent] = useState(true);
  const [visibleToParent, setVisibleToParent] = useState(true);
  const [requireSubmission, setRequireSubmission] = useState(true);
  const [saving, setSaving] = useState(false);

  const classes = classesState.data ?? [];

  const cycles = useMemo(() => {
    const byId = new Map<number, LevelCycle>();
    classes.forEach((item) => {
      if (item.level?.cycle?.id) byId.set(item.level.cycle.id, item.level.cycle);
    });
    return [...byId.values()].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [classes]);

  const levels = useMemo(() => {
    if (!cycleId) return [];
    const byId = new Map<number, NonNullable<SchoolClass['level']>>();
    classes.forEach((item) => {
      if (item.level?.cycle?.id === Number(cycleId)) byId.set(item.level.id, item.level);
    });
    return [...byId.values()].sort((a, b) =>
      (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name),
    );
  }, [classes, cycleId]);

  const levelClasses = useMemo(() => {
    if (!levelId) return [];
    return classes
      .filter((item) => item.level?.id === Number(levelId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, levelId]);

  const selectedClasses = useMemo(() => {
    if (classSelection === 'all') return levelClasses;
    const id = Number(classSelection);
    return levelClasses.filter((item) => item.id === id);
  }, [levelClasses, classSelection]);

  const availableSubjects = useMemo(
    () => commonSubjects(selectedClasses, subjectsState.data ?? [], levelId ? Number(levelId) : null),
    [selectedClasses, subjectsState.data, levelId],
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
    if (!subjectId) return [];
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
  }, [assignmentsState.data, selectedClasses, subjectId]);

  const assignmentsReady =
    previews.length > 0 && previews.every((item) => item.status === 'ready');
  const formReady =
    activeAcademicYearId != null &&
    !!cycleId &&
    !!levelId &&
    selectedClasses.length > 0 &&
    !!subjectId &&
    !!name.trim() &&
    !!deadline &&
    assignmentsReady &&
    !saving;

  const loadError = classesState.error ?? subjectsState.error ?? academicYearError;

  function resetScopeFromCycle(nextCycleId: string) {
    setCycleId(nextCycleId);
    setLevelId('');
    setClassSelection('all');
    setSubjectId('');
  }

  function resetScopeFromLevel(nextLevelId: string) {
    setLevelId(nextLevelId);
    setClassSelection('all');
    setSubjectId('');
  }

  function changeClassSelection(nextClassSelection: string) {
    setClassSelection(nextClassSelection);
    setSubjectId('');
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

    let request;
    try {
      request = buildHomeworkCreateRequest(
        {
          name,
          description,
          subject_id: Number(subjectId),
          academic_year_id: activeAcademicYearId,
          deadline,
          visible_to_student: visibleToStudent,
          visible_to_parent: visibleToParent,
          require_submission: requireSubmission,
        },
        targets,
      );
    } catch {
      toast.error(copy.invalidForm);
      return;
    }

    setSaving(true);
    const response = await api.post<unknown>(request.path, request.body);
    setSaving(false);

    if (!response.success) {
      toast.error(response.error.message);
      return;
    }

    toast.success(copy.sent);
    router.push('/admin/homeworks');
    router.refresh();
  }

  if (classesState.initialLoading || subjectsState.initialLoading || (activeAcademicYearId == null && !academicYearError)) {
    return (
      <div className="admin-workspace">
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <p className="muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-workspace">
        <Link href="/admin/homeworks" className="back-link">‹ {copy.back}</Link>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <Card>
          <p className="muted">{loadError.message || copy.loadFailed}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-workspace">
      <Link href="/admin/homeworks" className="back-link">‹ {copy.back}</Link>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <form className="col" style={{ gap: 16 }} onSubmit={handleSubmit}>
        <Card>
          <h2>{copy.scope}</h2>
          <div className="grid grid--form" style={{ marginTop: 12 }}>
            <label className="field">
              <span>{copy.cycle}</span>
              <select value={cycleId} onChange={(event) => resetScopeFromCycle(event.target.value)}>
                <option value="">{copy.selectCycle}</option>
                {cycles.map((cycle) => (
                  <option key={cycleKey(cycle)} value={cycle.id}>{cycle.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{copy.level}</span>
              <select value={levelId} disabled={!cycleId} onChange={(event) => resetScopeFromLevel(event.target.value)}>
                <option value="">{copy.selectLevel}</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>{level.display_name ?? level.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{copy.section}</span>
              <select
                value={classSelection}
                disabled={!levelId || levelClasses.length === 0}
                onChange={(event) => changeClassSelection(event.target.value)}
              >
                <option value="all">{copy.allSections}</option>
                {levelClasses.map((item) => (
                  <option key={item.id} value={item.id}>{item.display_name ?? item.name}</option>
                ))}
              </select>
              {levelId && levelClasses.length === 0 ? <small className="muted">{copy.noClasses}</small> : null}
            </label>

            <label className="field">
              <span>{t('academic.subject')}</span>
              <select
                value={subjectId}
                disabled={selectedClasses.length === 0}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">{copy.selectSubject}</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              {selectedClasses.length > 0 && availableSubjects.length === 0 ? (
                <small className="muted">{copy.noSubjects}</small>
              ) : null}
            </label>
          </div>
        </Card>

        <Card>
          <h2>{copy.details}</h2>
          <div className="grid grid--form" style={{ marginTop: 12 }}>
            <label className="field">
              <span>{copy.homeworkTitle}</span>
              <input value={name} maxLength={180} required onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              <span>{t('academic.deadline')}</span>
              <input type="date" value={deadline} required onChange={(event) => setDeadline(event.target.value)} />
            </label>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            <span>{copy.description}</span>
            <textarea rows={7} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        </Card>

        <Card>
          <h2>{copy.visibility}</h2>
          <div className="col" style={{ gap: 10, marginTop: 12 }}>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={visibleToStudent} onChange={(event) => setVisibleToStudent(event.target.checked)} />
              <span>{copy.visibleStudent}</span>
            </label>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={visibleToParent} onChange={(event) => setVisibleToParent(event.target.checked)} />
              <span>{copy.visibleParent}</span>
            </label>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={requireSubmission} onChange={(event) => setRequireSubmission(event.target.checked)} />
              <span>{copy.requireSubmission}</span>
            </label>
          </div>
        </Card>

        <Card>
          <h2>{copy.preview}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{copy.previewHint}</p>
          {assignmentsState.loading ? (
            <p className="muted" style={{ marginTop: 12 }}>{t('common.loading')}</p>
          ) : assignmentsState.error ? (
            <p className="muted" style={{ marginTop: 12 }}>{copy.assignmentLoadFailed}</p>
          ) : previews.length > 0 ? (
            <div className="col" style={{ gap: 8, marginTop: 12 }}>
              {previews.map((preview) => (
                <div key={preview.classItem.id} className="between card" style={{ padding: 12 }}>
                  <strong dir="auto">{preview.classItem.display_name ?? preview.classItem.name}</strong>
                  {preview.status === 'ready' ? (
                    <span dir="auto">{preview.assignment!.teacher.name} · {copy.teacherReady}</span>
                  ) : (
                    <span className="muted">
                      {preview.status === 'missing' ? copy.teacherMissing : copy.teacherAmbiguous}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <Link href="/admin/homeworks" className="btn btn--ghost">{t('common.cancel')}</Link>
          <button type="submit" className="btn btn--primary" disabled={!formReady}>
            {saving ? copy.sending : copy.send}
          </button>
        </div>
      </form>
    </div>
  );
}
