'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import {
  buildClassPayload,
  existingClassNamesForCanonicalScope,
  resolveLevelAcademicCode,
  suggestNextCanonicalClassName,
} from '@/features/admin/class-form-utils';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { ClassRemovalResponse, Level, SchoolClass } from '@/types/class';

const CLASSES_QUERY = { page_size: 500 };
const LEVELS_QUERY = { page_size: 500 };
const LEVEL_SELECT_SELECTOR = '.class-distribution__level-select select';

const COPY = {
  ar: {
    add: 'إضافة قسم',
    addTitle: 'إنشاء قسم جديد',
    addConfirm: 'إنشاء القسم',
    addLead: 'سيتم إنشاء القسم مباشرة داخل السنة الدراسية والمستوى الحاليين، دون مغادرة صفحة التوزيع.',
    defaultName: 'القسم الجديد',
    academicYear: 'السنة الدراسية',
    level: 'المستوى',
    selectLevelFirst: 'اختر المستوى أولًا لإنشاء قسم داخله.',
    namingUnavailable: 'تعذر توليد اسم افتراضي لهذا المستوى. تحقق من الرمز الأكاديمي للمستوى.',
    addFailed: 'تعذر إنشاء القسم. أعد المحاولة.',
    duplicate: 'الاسم الافتراضي موجود بالفعل. حدّث الصفحة وحاول من جديد.',
    remove: 'حذف قسم',
    removeTitle: 'حذف قسم',
    selectClass: 'اختر القسم الذي تريد حذفه',
    confirm: 'حذف القسم',
    caution: 'سيمنع النظام الحذف إذا كان القسم مرتبطًا بتلاميذ أو بيانات تشغيلية حالية. وإذا كانت هناك بيانات تاريخية فقط فسيتم إيقاف القسم مع حفظها.',
    inUse: 'لا يمكن حذف هذا القسم لأنه ما زال مستخدمًا. انقل التلاميذ أو أنهِ الارتباطات التشغيلية أولًا.',
    failed: 'تعذر حذف القسم. أعد المحاولة.',
    students: 'تلميذ',
  },
  en: {
    add: 'Add class',
    addTitle: 'Create class',
    addConfirm: 'Create class',
    addLead: 'The class will be created in the current academic year and level without leaving the distribution page.',
    defaultName: 'New class',
    academicYear: 'Academic year',
    level: 'Level',
    selectLevelFirst: 'Select a level first to create a class in it.',
    namingUnavailable: 'A default class name could not be generated. Check the level academic code.',
    addFailed: 'Could not create the class. Try again.',
    duplicate: 'The suggested class name already exists. Refresh and try again.',
    remove: 'Delete class',
    removeTitle: 'Delete class',
    selectClass: 'Choose the class to delete',
    confirm: 'Delete class',
    caution: 'Deletion is blocked while the class is linked to current students or operational data. Historical-only classes are deactivated while history is preserved.',
    inUse: 'This class is still in use. Move students or clear active operational links first.',
    failed: 'Could not delete the class. Try again.',
    students: 'students',
  },
  fr: {
    add: 'Ajouter une classe',
    addTitle: 'Créer une classe',
    addConfirm: 'Créer la classe',
    addLead: 'La classe sera créée dans l’année scolaire et le niveau actuels sans quitter la page de répartition.',
    defaultName: 'Nouvelle classe',
    academicYear: 'Année scolaire',
    level: 'Niveau',
    selectLevelFirst: 'Choisissez d’abord un niveau pour y créer une classe.',
    namingUnavailable: 'Impossible de générer un nom de classe par défaut. Vérifiez le code académique du niveau.',
    addFailed: 'Impossible de créer la classe. Réessayez.',
    duplicate: 'Le nom proposé existe déjà. Actualisez puis réessayez.',
    remove: 'Supprimer une classe',
    removeTitle: 'Supprimer une classe',
    selectClass: 'Choisissez la classe à supprimer',
    confirm: 'Supprimer la classe',
    caution: 'La suppression est bloquée tant que la classe est liée à des élèves ou à des données opérationnelles actives. Les classes avec historique uniquement sont désactivées en conservant cet historique.',
    inUse: 'Cette classe est encore utilisée. Déplacez les élèves ou terminez d’abord les liens opérationnels actifs.',
    failed: 'Impossible de supprimer la classe. Réessayez.',
    students: 'élèves',
  },
  es: {
    add: 'Añadir clase',
    addTitle: 'Crear clase',
    addConfirm: 'Crear clase',
    addLead: 'La clase se creará en el curso académico y nivel actuales sin salir de la página de distribución.',
    defaultName: 'Nueva clase',
    academicYear: 'Curso académico',
    level: 'Nivel',
    selectLevelFirst: 'Selecciona primero un nivel para crear una clase en él.',
    namingUnavailable: 'No se pudo generar un nombre de clase predeterminado. Revisa el código académico del nivel.',
    addFailed: 'No se pudo crear la clase. Inténtalo de nuevo.',
    duplicate: 'El nombre sugerido ya existe. Actualiza e inténtalo de nuevo.',
    remove: 'Eliminar clase',
    removeTitle: 'Eliminar clase',
    selectClass: 'Elige la clase que quieres eliminar',
    confirm: 'Eliminar clase',
    caution: 'La eliminación se bloquea mientras la clase esté vinculada a alumnos o datos operativos actuales. Si solo existe historial, la clase se desactiva conservándolo.',
    inUse: 'Esta clase sigue en uso. Mueve a los alumnos o finaliza primero los vínculos operativos activos.',
    failed: 'No se pudo eliminar la clase. Inténtalo de nuevo.',
    students: 'alumnos',
  },
} as const;

function occupancy(cls: SchoolClass): number {
  return cls.assigned_count ?? cls.student_count ?? 0;
}

function verticalScrollHost(from: Element): HTMLElement | null {
  let current = from.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const canScroll = /auto|scroll/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1;
    if (canScroll) return current;
    current = current.parentElement;
  }
  const scrolling = document.scrollingElement;
  return scrolling instanceof HTMLElement ? scrolling : document.documentElement;
}

function refreshBoardKeepingLevel() {
  const select = document.querySelector<HTMLSelectElement>(LEVEL_SELECT_SELECTOR);
  const value = select?.value ?? '';
  if (!select || !value) return;

  // Force the board's own controlled level state through an empty->current transition.
  // This refetches the authoritative workspace without a page reload, preserving cycle/level.
  select.value = '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  window.requestAnimationFrame(() => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export function ClassDistributionShellEnhancements() {
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.ar;
  const { activeAcademicYearId, academicYears } = useAdminSession();
  const classesState = useGlobalAcademicYearResource<SchoolClass[]>(
    endpoints.admin.classes,
    CLASSES_QUERY,
  );
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels, LEVELS_QUERY);
  const [contextLevelId, setContextLevelId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const classes = useMemo(
    () =>
      [...(classesState.data ?? [])]
        .filter((cls) => cls.status !== 'archived')
        .sort((a, b) => {
          const levelA = a.level?.name ?? '';
          const levelB = b.level?.name ?? '';
          const levelOrder = levelA.localeCompare(levelB, locale, {
            numeric: true,
            sensitivity: 'base',
          });
          if (levelOrder !== 0) return levelOrder;
          return a.name.localeCompare(b.name, locale, {
            numeric: true,
            sensitivity: 'base',
          });
        }),
    [classesState.data, locale],
  );

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === deleteClassId) ?? null,
    [classes, deleteClassId],
  );

  const contextLevel = useMemo(
    () => (levelsState.data ?? []).find((level) => level.id === contextLevelId) ?? null,
    [contextLevelId, levelsState.data],
  );

  const contextYear = useMemo(
    () => academicYears.find((year) => year.id === activeAcademicYearId) ?? null,
    [academicYears, activeAcademicYearId],
  );

  const suggestedClassName = useMemo(() => {
    if (!contextLevelId || !activeAcademicYearId || !contextLevel) return null;
    const levelClasses = classes.filter((cls) => cls.level?.id === contextLevelId);
    const academicCode =
      resolveLevelAcademicCode(contextLevel) ??
      levelClasses.map((cls) => cls.level?.academic_code ?? cls.academic_code ?? null).find(Boolean) ??
      null;
    if (!academicCode) return null;
    const existingNames = existingClassNamesForCanonicalScope(classes, {
      levelId: contextLevelId,
      academicYearId: String(activeAcademicYearId),
    });
    return suggestNextCanonicalClassName(academicCode, existingNames);
  }, [activeAcademicYearId, classes, contextLevel, contextLevelId]);

  const canQuickCreate = Boolean(
    activeAcademicYearId && contextLevelId && contextLevel && suggestedClassName,
  );

  useEffect(() => {
    const readCurrentLevel = () => {
      const select = document.querySelector<HTMLSelectElement>(LEVEL_SELECT_SELECTOR);
      if (!select) return;
      const id = Number(select.value);
      setContextLevelId(Number.isFinite(id) && id > 0 ? id : null);
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.matches(LEVEL_SELECT_SELECTOR)) return;
      const id = Number(target.value);
      setContextLevelId(Number.isFinite(id) && id > 0 ? id : null);
      setAddError(null);
    };

    const frame = window.requestAnimationFrame(readCurrentLevel);
    document.addEventListener('change', onChange, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('change', onChange, true);
    };
  }, []);

  useEffect(() => {
    const preserveVerticalWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const scroller = target.closest('.class-distribution-direct__scroller');
      if (!scroller) return;
      if (event.shiftKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      const host = verticalScrollHost(scroller);
      if (!host) return;
      event.preventDefault();
      event.stopPropagation();
      host.scrollBy({ top: event.deltaY, behavior: 'auto' });
    };

    document.addEventListener('wheel', preserveVerticalWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      document.removeEventListener('wheel', preserveVerticalWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    const autoScrollDuringDrag = (event: globalThis.DragEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const scroller = document.querySelector<HTMLElement>('.class-distribution-direct__scroller');
      if (!scroller || !scroller.contains(target)) return;
      if (!scroller.querySelector('[aria-grabbed="true"]')) return;
      if (scroller.scrollWidth <= scroller.clientWidth + 2) return;

      const rect = scroller.getBoundingClientRect();
      const edge = Math.min(120, Math.max(72, rect.width * 0.12));
      let visualDirection = 0;
      let proximity = 0;

      if (event.clientX < rect.left + edge) {
        visualDirection = -1;
        proximity = Math.min(1, (rect.left + edge - event.clientX) / edge);
      } else if (event.clientX > rect.right - edge) {
        visualDirection = 1;
        proximity = Math.min(1, (event.clientX - (rect.right - edge)) / edge);
      }

      if (!visualDirection) return;
      const speed = 14 + Math.round(34 * proximity);
      const rtl = window.getComputedStyle(scroller).direction === 'rtl';
      scroller.scrollBy({
        left: (rtl ? -visualDirection : visualDirection) * speed,
        behavior: 'auto',
      });
    };

    document.addEventListener('dragover', autoScrollDuringDrag, true);
    return () => document.removeEventListener('dragover', autoScrollDuringDrag, true);
  }, []);

  function openAddDialog() {
    const select = document.querySelector<HTMLSelectElement>(LEVEL_SELECT_SELECTOR);
    const current = Number(select?.value ?? '');
    const nextLevelId = Number.isFinite(current) && current > 0 ? current : contextLevelId;
    setContextLevelId(nextLevelId ?? null);
    setAddError(null);
    setAddOpen(true);
  }

  async function createClass() {
    if (!activeAcademicYearId || !contextLevelId || !suggestedClassName) {
      setAddError(contextLevelId ? copy.namingUnavailable : copy.selectLevelFirst);
      return;
    }

    setAddLoading(true);
    setAddError(null);
    const payload = buildClassPayload({
      name: suggestedClassName,
      levelId: String(contextLevelId),
      trackId: '',
      academicYearId: String(activeAcademicYearId),
      capacity: '',
      room: '',
      teacherIds: [],
      subjectIds: [],
      subjectsTouched: false,
      creating: true,
    });
    const result = await api.post<SchoolClass>(endpoints.admin.classes, payload);
    setAddLoading(false);

    if (!result.success) {
      setAddError(
        result.error.code === 'duplicate_record' || result.error.code === 'conflict'
          ? copy.duplicate
          : copy.addFailed,
      );
      return;
    }

    setAddOpen(false);
    setAddError(null);
    classesState.reload();
    refreshBoardKeepingLevel();
  }

  function openDeleteDialog() {
    const first = classes[0]?.id ?? null;
    setDeleteClassId((current) => current ?? first);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function deleteClass() {
    if (deleteClassId == null) return;
    setDeleteLoading(true);
    setDeleteError(null);

    const result = await api.delete<ClassRemovalResponse>(
      endpoints.admin.classDelete(deleteClassId),
    );

    setDeleteLoading(false);
    if (!result.success) {
      setDeleteError(result.error.code === 'class_in_use' ? copy.inUse : copy.failed);
      return;
    }

    setDeleteOpen(false);
    setDeleteError(null);
    classesState.reload();
    refreshBoardKeepingLevel();
  }

  return (
    <>
      <div className="class-distribution-shell-actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={openAddDialog}
        >
          <span aria-hidden="true">＋</span>
          {copy.add}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm class-distribution-shell-actions__delete"
          disabled={classesState.loading || classes.length === 0}
          onClick={openDeleteDialog}
        >
          <span aria-hidden="true">⌫</span>
          {copy.remove}
        </button>
      </div>

      <ConfirmationDialog
        open={addOpen}
        title={copy.addTitle}
        confirmLabel={copy.addConfirm}
        loading={addLoading}
        onClose={() => {
          if (!addLoading) {
            setAddOpen(false);
            setAddError(null);
          }
        }}
        onConfirm={createClass}
        body={
          <div className="class-distribution-quick-create-dialog">
            <p className="class-distribution-quick-create-dialog__lead">{copy.addLead}</p>

            <div className="class-distribution-quick-create-dialog__name">
              <span>{copy.defaultName}</span>
              <strong dir="ltr">{suggestedClassName ?? '—'}</strong>
            </div>

            <div className="class-distribution-quick-create-dialog__context">
              <div>
                <span>{copy.academicYear}</span>
                <strong dir="auto">{contextYear?.name ?? '—'}</strong>
              </div>
              <div>
                <span>{copy.level}</span>
                <strong dir="auto">{contextLevel?.name ?? '—'}</strong>
              </div>
            </div>

            {!contextLevelId ? (
              <p className="class-distribution-quick-create-dialog__error" role="alert">
                {copy.selectLevelFirst}
              </p>
            ) : !suggestedClassName ? (
              <p className="class-distribution-quick-create-dialog__error" role="alert">
                {copy.namingUnavailable}
              </p>
            ) : null}

            {addError ? (
              <p className="class-distribution-quick-create-dialog__error" role="alert">
                {addError}
              </p>
            ) : null}

            <input type="hidden" value={canQuickCreate ? 'ready' : 'blocked'} readOnly />
          </div>
        }
      />

      <ConfirmationDialog
        open={deleteOpen}
        title={copy.removeTitle}
        confirmLabel={copy.confirm}
        variant="danger"
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={deleteClass}
        body={
          <div className="class-distribution-delete-dialog">
            <label>
              <span>{copy.selectClass}</span>
              <select
                className="input"
                value={deleteClassId ?? ''}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  setDeleteClassId(Number.isFinite(id) && id > 0 ? id : null);
                  setDeleteError(null);
                }}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.level?.name ? `${cls.level.name} — ` : ''}
                    {cls.name} — {occupancy(cls)} {copy.students}
                  </option>
                ))}
              </select>
            </label>

            {selectedClass ? (
              <div className="class-distribution-delete-dialog__summary">
                <strong dir="auto">{selectedClass.name}</strong>
                <span>
                  {occupancy(selectedClass)} {copy.students}
                  {selectedClass.capacity ? ` / ${selectedClass.capacity}` : ''}
                </span>
              </div>
            ) : null}

            <p className="class-distribution-delete-dialog__caution">{copy.caution}</p>
            {deleteError ? (
              <p className="class-distribution-delete-dialog__error" role="alert">
                {deleteError}
              </p>
            ) : null}
          </div>
        }
      />
    </>
  );
}
