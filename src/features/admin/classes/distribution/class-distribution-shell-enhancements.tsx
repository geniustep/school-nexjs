'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ClassRemovalResponse, SchoolClass } from '@/types/class';

const CLASSES_QUERY = { page_size: 500 };

const COPY = {
  ar: {
    add: 'إضافة قسم',
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

export function ClassDistributionShellEnhancements() {
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.ar;
  const classesState = useGlobalAcademicYearResource<SchoolClass[]>(
    endpoints.admin.classes,
    CLASSES_QUERY,
  );
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

  useEffect(() => {
    const preserveVerticalWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('.class-distribution-direct__scroller')) return;
      if (event.shiftKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      // The distribution board used to convert a normal vertical mouse-wheel gesture
      // into horizontal lane scrolling. Stop the event before it reaches that listener
      // while keeping the browser default action, so the page scrolls vertically.
      event.stopPropagation();
    };

    document.addEventListener('wheel', preserveVerticalWheel, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener('wheel', preserveVerticalWheel, { capture: true });
    };
  }, []);

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

    // A structural class mutation changes both the class list and the distribution
    // workspace. Reload once so both client-side resources are authoritative again.
    window.location.reload();
  }

  return (
    <>
      <div className="class-distribution-shell-actions" aria-label={copy.add}>
        <Link className="btn btn--primary btn--sm" href="/admin/classes/new">
          <span aria-hidden="true">＋</span>
          {copy.add}
        </Link>
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
