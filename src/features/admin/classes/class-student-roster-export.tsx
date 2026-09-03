'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { Ref } from '@/types/api';
import type { Student } from '@/types/student';

type RosterClass = {
  id: number;
  name: string;
  academic_year: string | Ref | { id: number; name: string } | null;
  academic_year_id?: number;
  school?: Ref;
};

type Labels = {
  button: string;
  title: string;
  classRoster: string;
  teacherRoster: string;
  rosterKind: string;
  teacher: string;
  subject: string;
  className: string;
  academicYear: string;
  studentCount: string;
  number: string;
  studentName: string;
  massar: string;
  birthDate: string;
  notes: string;
  pdf: string;
  excel: string;
  close: string;
  loading: string;
  noAssignments: string;
  noStudents: string;
  exportFailed: string;
  popupBlocked: string;
  excelReady: string;
};

const LABELS: Record<'ar' | 'fr' | 'en' | 'es', Labels> = {
  ar: {
    button: 'تصدير لائحة التلاميذ',
    title: 'لائحة تلاميذ القسم',
    classRoster: 'لائحة القسم',
    teacherRoster: 'لائحة الأستاذ والمادة',
    rosterKind: 'نوع اللائحة',
    teacher: 'الأستاذ(ة)',
    subject: 'المادة',
    className: 'القسم',
    academicYear: 'السنة الدراسية',
    studentCount: 'عدد التلاميذ',
    number: '#',
    studentName: 'اسم التلميذ',
    massar: 'رقم مسار',
    birthDate: 'تاريخ الازدياد',
    notes: 'ملاحظات',
    pdf: 'PDF / طباعة',
    excel: 'Excel',
    close: 'إغلاق',
    loading: 'جارٍ تجهيز بيانات اللائحة…',
    noAssignments: 'لا توجد إسنادات تدريسية نشطة لهذا القسم في السنة الدراسية الحالية.',
    noStudents: 'لا يوجد تلاميذ في هذا القسم.',
    exportFailed: 'تعذر تجهيز اللائحة. أعد المحاولة.',
    popupBlocked: 'تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.',
    excelReady: 'تم تجهيز ملف Excel.',
  },
  fr: {
    button: 'Exporter la liste des élèves',
    title: 'Liste des élèves de la classe',
    classRoster: 'Liste de la classe',
    teacherRoster: "Liste de l’enseignant et de la matière",
    rosterKind: 'Type de liste',
    teacher: 'Enseignant(e)',
    subject: 'Matière',
    className: 'Classe',
    academicYear: 'Année scolaire',
    studentCount: "Nombre d’élèves",
    number: '#',
    studentName: "Nom de l’élève",
    massar: 'Code Massar',
    birthDate: 'Date de naissance',
    notes: 'Observations',
    pdf: 'PDF / Imprimer',
    excel: 'Excel',
    close: 'Fermer',
    loading: 'Préparation des données…',
    noAssignments: 'Aucune affectation pédagogique active pour cette classe pendant l’année scolaire courante.',
    noStudents: 'Aucun élève dans cette classe.',
    exportFailed: 'Impossible de préparer la liste. Réessayez.',
    popupBlocked: 'Impossible d’ouvrir la fenêtre d’impression. Autorisez les fenêtres pop-up puis réessayez.',
    excelReady: 'Le fichier Excel est prêt.',
  },
  en: {
    button: 'Export student roster',
    title: 'Class student roster',
    classRoster: 'Class roster',
    teacherRoster: 'Teacher and subject roster',
    rosterKind: 'Roster type',
    teacher: 'Teacher',
    subject: 'Subject',
    className: 'Class',
    academicYear: 'Academic year',
    studentCount: 'Students',
    number: '#',
    studentName: 'Student name',
    massar: 'Massar code',
    birthDate: 'Date of birth',
    notes: 'Notes',
    pdf: 'PDF / Print',
    excel: 'Excel',
    close: 'Close',
    loading: 'Preparing roster data…',
    noAssignments: 'No active teaching assignments were found for this class in the current academic year.',
    noStudents: 'There are no students in this class.',
    exportFailed: 'Could not prepare the roster. Please try again.',
    popupBlocked: 'Could not open the print window. Allow pop-ups and try again.',
    excelReady: 'The Excel file is ready.',
  },
  es: {
    button: 'Exportar lista de alumnos',
    title: 'Lista de alumnos de la clase',
    classRoster: 'Lista de la clase',
    teacherRoster: 'Lista del profesor y la asignatura',
    rosterKind: 'Tipo de lista',
    teacher: 'Profesor(a)',
    subject: 'Asignatura',
    className: 'Clase',
    academicYear: 'Año académico',
    studentCount: 'Alumnos',
    number: '#',
    studentName: 'Nombre del alumno',
    massar: 'Código Massar',
    birthDate: 'Fecha de nacimiento',
    notes: 'Observaciones',
    pdf: 'PDF / Imprimir',
    excel: 'Excel',
    close: 'Cerrar',
    loading: 'Preparando los datos…',
    noAssignments: 'No hay asignaciones docentes activas para esta clase en el año académico actual.',
    noStudents: 'No hay alumnos en esta clase.',
    exportFailed: 'No se pudo preparar la lista. Inténtalo de nuevo.',
    popupBlocked: 'No se pudo abrir la ventana de impresión. Permite las ventanas emergentes e inténtalo de nuevo.',
    excelReady: 'El archivo Excel está listo.',
  },
};

function resolveLabels(locale: string): Labels {
  if (locale === 'fr' || locale === 'es' || locale === 'en') return LABELS[locale];
  return LABELS.ar;
}

function resolveAcademicYearId(cls: RosterClass): number | undefined {
  if (cls.academic_year_id) return cls.academic_year_id;
  if (cls.academic_year && typeof cls.academic_year === 'object') {
    const value = Number(cls.academic_year.id);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  return undefined;
}

function resolveAcademicYearName(cls: RosterClass, assignment?: TeachingAssignment | null): string {
  if (assignment?.academic_year?.name) return assignment.academic_year.name;
  if (typeof cls.academic_year === 'string') return cls.academic_year;
  return cls.academic_year?.name ?? '';
}

function formatBirthDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#039;';
    }
  });
}

function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'roster';
}

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function activeAssignments(items: TeachingAssignment[]): TeachingAssignment[] {
  return items.filter(
    (assignment) => assignment.active && !['ended', 'cancelled'].includes(assignment.state),
  );
}

async function loadAllClassStudents(classId: number): Promise<Student[]> {
  const all: Student[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await api.get<Student[]>(endpoints.admin.students, {
      class_id: classId,
      page,
      page_size: 200,
    });
    if (!res.success) throw new Error(res.error.message);
    all.push(...res.data);
    totalPages = Math.max(1, res.meta.pagination?.total_pages ?? 1);
    page += 1;
  } while (page <= totalPages);

  return all;
}

function rosterRows(students: Student[], locale: string) {
  const collationLocale = locale === 'ar' ? 'ar' : locale === 'fr' ? 'fr' : 'en';
  return [...students]
    .sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), collationLocale))
    .map((student, index) => ({
      number: index + 1,
      name: getStudentDisplayName(student),
      massar: student.massar_code ?? '',
      birthDate: formatBirthDate(student.date_of_birth),
    }));
}

export function ClassStudentRosterExport({ cls }: { cls: RosterClass }) {
  const { locale } = useLocale();
  const labels = resolveLabels(locale);
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rosterKind, setRosterKind] = useState<'class' | 'teacher'>('class');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const academicYearId = resolveAcademicYearId(cls);

  const teachers = useMemo(
    () => uniqueById(assignments.map((assignment) => assignment.teacher)),
    [assignments],
  );
  const subjects = useMemo(
    () => uniqueById(
      assignments
        .filter((assignment) => assignment.teacher.id === teacherId)
        .map((assignment) => assignment.subject),
    ),
    [assignments, teacherId],
  );
  const selectedAssignment = useMemo(
    () => assignments.find(
      (assignment) => assignment.teacher.id === teacherId && assignment.subject.id === subjectId,
    ) ?? null,
    [assignments, teacherId, subjectId],
  );
  const rows = useMemo(() => rosterRows(students, locale), [students, locale]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setAssignments([]);
      setStudents([]);
      setRosterKind('class');
      setTeacherId(null);
      setSubjectId(null);

      const assignmentQuery: Record<string, string | number> = {
        class_id: cls.id,
        page: 1,
        limit: 200,
      };
      if (academicYearId) assignmentQuery.academic_year_id = academicYearId;

      const [assignmentRes, studentResult] = await Promise.all([
        api.get<TeachingAssignment[]>(endpoints.admin.teachingAssignments, assignmentQuery),
        loadAllClassStudents(cls.id).then(
          (data) => ({ ok: true as const, data }),
          (loadError: unknown) => ({ ok: false as const, error: loadError }),
        ),
      ]);

      if (cancelled) return;
      setLoading(false);

      if (!studentResult.ok) {
        setError(labels.exportFailed);
        return;
      }

      const nextAssignments = assignmentRes.success ? activeAssignments(assignmentRes.data) : [];
      setAssignments(nextAssignments);
      setStudents(studentResult.data);
      const first = nextAssignments[0];
      if (first) {
        setTeacherId(first.teacher.id);
        setSubjectId(first.subject.id);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, cls.id, academicYearId, labels.exportFailed]);

  useEffect(() => {
    if (teacherId == null) return;
    if (subjects.some((subject) => subject.id === subjectId)) return;
    setSubjectId(subjects[0]?.id ?? null);
  }, [teacherId, subjectId, subjects]);

  function openPdfPrint() {
    if (rosterKind === 'teacher' && !selectedAssignment) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(labels.popupBlocked);
      return;
    }
    printWindow.opener = null;

    const direction = locale === 'ar' ? 'rtl' : 'ltr';
    const schoolName = cls.school?.name ?? '';
    const academicYear = resolveAcademicYearName(cls, selectedAssignment);
    const teacherMeta = rosterKind === 'teacher' && selectedAssignment
      ? `<div><strong>${escapeHtml(labels.teacher)}:</strong> ${escapeHtml(selectedAssignment.teacher.name)}</div>
         <div><strong>${escapeHtml(labels.subject)}:</strong> ${escapeHtml(selectedAssignment.subject.name)}</div>`
      : '';
    const tableRows = rows.map((row) => `
      <tr>
        <td class="number">${row.number}</td>
        <td class="student-name">${escapeHtml(row.name)}</td>
        <td class="ltr">${escapeHtml(row.massar)}</td>
        <td class="ltr">${escapeHtml(row.birthDate)}</td>
        <td class="notes"></td>
      </tr>`).join('');

    printWindow.document.write(`<!doctype html>
<html lang="${escapeHtml(locale)}" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)} — ${escapeHtml(cls.name)}</title>
  <style>
    @page { size: A4 landscape; margin: 11mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Tahoma, sans-serif; color: #111827; font-size: 12px; }
    .header { text-align: center; margin-bottom: 10px; }
    .school { min-height: 20px; font-size: 14px; font-weight: 700; }
    h1 { margin: 4px 0 10px; font-size: 20px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 10px; font-size: 12px; }
    .meta strong { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #4b5563; padding: 6px 7px; vertical-align: middle; }
    th { background: #f3f4f6; font-weight: 700; text-align: center; }
    tbody tr { height: 30px; page-break-inside: avoid; }
    .number { width: 5%; text-align: center; }
    .student-name { width: 31%; font-weight: 600; }
    .ltr { direction: ltr; text-align: center; width: 16%; }
    .notes { width: 32%; }
    .footer { margin-top: 7px; font-weight: 700; }
  </style>
</head>
<body>
  <header class="header">
    <div class="school">${escapeHtml(schoolName)}</div>
    <h1>${escapeHtml(labels.title)}</h1>
  </header>
  <section class="meta">
    ${teacherMeta}
    <div><strong>${escapeHtml(labels.className)}:</strong> ${escapeHtml(cls.name)}</div>
    <div><strong>${escapeHtml(labels.academicYear)}:</strong> ${escapeHtml(academicYear)}</div>
  </section>
  <table>
    <thead>
      <tr>
        <th class="number">${escapeHtml(labels.number)}</th>
        <th class="student-name">${escapeHtml(labels.studentName)}</th>
        <th class="ltr">${escapeHtml(labels.massar)}</th>
        <th class="ltr">${escapeHtml(labels.birthDate)}</th>
        <th class="notes">${escapeHtml(labels.notes)}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">${escapeHtml(labels.studentCount)}: ${rows.length}</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    window.setTimeout(() => printWindow.print(), 250);
  }

  async function downloadExcel() {
    if ((rosterKind === 'teacher' && !selectedAssignment) || excelLoading) return;
    setExcelLoading(true);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Raqeem';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet(labels.title.slice(0, 31), {
        views: [{ rightToLeft: locale === 'ar', state: 'frozen', ySplit: 6 }],
      });

      worksheet.columns = [
        { key: 'number', width: 7 },
        { key: 'name', width: 34 },
        { key: 'massar', width: 20 },
        { key: 'birthDate', width: 17 },
        { key: 'notes', width: 32 },
      ];

      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = cls.school?.name ?? '';
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:E2');
      worksheet.getCell('A2').value = labels.title;
      worksheet.getCell('A2').font = { bold: true, size: 16 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      if (rosterKind === 'teacher' && selectedAssignment) {
        worksheet.mergeCells('A3:B3');
        worksheet.getCell('A3').value = `${labels.teacher}: ${selectedAssignment.teacher.name}`;
        worksheet.mergeCells('C3:E3');
        worksheet.getCell('C3').value = `${labels.subject}: ${selectedAssignment.subject.name}`;
      }
      worksheet.mergeCells('A4:B4');
      worksheet.getCell('A4').value = `${labels.className}: ${cls.name}`;
      worksheet.mergeCells('C4:E4');
      worksheet.getCell('C4').value = `${labels.academicYear}: ${resolveAcademicYearName(cls, selectedAssignment)}`;
      worksheet.mergeCells('A5:E5');
      worksheet.getCell('A5').value = `${labels.studentCount}: ${rows.length}`;

      const header = worksheet.getRow(6);
      header.values = [labels.number, labels.studentName, labels.massar, labels.birthDate, labels.notes];
      header.font = { bold: true };
      header.alignment = { horizontal: 'center', vertical: 'middle' };
      header.height = 24;

      rows.forEach((row) => {
        const excelRow = worksheet.addRow({
          number: row.number,
          name: row.name,
          massar: row.massar,
          birthDate: row.birthDate,
          notes: '',
        });
        excelRow.height = 24;
        excelRow.alignment = { vertical: 'middle' };
        excelRow.getCell('number').alignment = { horizontal: 'center', vertical: 'middle' };
        excelRow.getCell('massar').alignment = { horizontal: 'center', vertical: 'middle' };
        excelRow.getCell('birthDate').alignment = { horizontal: 'center', vertical: 'middle' };
      });

      worksheet.autoFilter = 'A6:E6';
      worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const filename = [
        labels.title,
        ...(rosterKind === 'teacher' && selectedAssignment
          ? [selectedAssignment.teacher.name, selectedAssignment.subject.name]
          : []),
        cls.name,
      ].map(safeFilenamePart).join('_');
      anchor.href = url;
      anchor.download = `${filename}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(labels.excelReady);
    } catch {
      toast.error(labels.exportFailed);
    } finally {
      setExcelLoading(false);
    }
  }

  const canExport = !loading
    && !error
    && rows.length > 0
    && (rosterKind === 'class' || selectedAssignment != null);

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => setOpen(true)}
      >
        {labels.button}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        aria-labelledby="class-student-roster-export-title"
        style={{
          width: 'min(92vw, 560px)',
          maxWidth: 560,
          padding: 0,
          border: 'none',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.24)',
        }}
      >
        <div className="col" style={{ gap: 16, padding: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 4 }}>
              <strong id="class-student-roster-export-title" style={{ fontSize: 18 }}>{labels.title}</strong>
              <span className="muted tiny">{labels.className}: {cls.name}</span>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)} aria-label={labels.close}>×</button>
          </div>

          {loading ? <p className="muted">{labels.loading}</p> : null}
          {error ? <p className="muted">{error}</p> : null}
          {!loading && !error ? (
            <>
              <label className="col" style={{ gap: 6 }}>
                <span className="tiny muted">{labels.rosterKind}</span>
                <select className="input" value={rosterKind} onChange={(event) => setRosterKind(event.target.value as 'class' | 'teacher')}>
                  <option value="class">{labels.classRoster}</option>
                  <option value="teacher">{labels.teacherRoster}</option>
                </select>
              </label>

              {rosterKind === 'teacher' && assignments.length > 0 ? (
                <>
                  <label className="col" style={{ gap: 6 }}>
                    <span className="tiny muted">{labels.teacher}</span>
                    <select className="input" value={teacherId ?? ''} onChange={(event) => setTeacherId(Number(event.target.value))}>
                      {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                    </select>
                  </label>

                  <label className="col" style={{ gap: 6 }}>
                    <span className="tiny muted">{labels.subject}</span>
                    <select className="input" value={subjectId ?? ''} onChange={(event) => setSubjectId(Number(event.target.value))}>
                      {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </select>
                  </label>
                </>
              ) : null}

              {rosterKind === 'teacher' && assignments.length === 0 ? <p className="muted">{labels.noAssignments}</p> : null}

              <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span className="tiny muted">{labels.academicYear}: {resolveAcademicYearName(cls, selectedAssignment)}</span>
                <strong>{labels.studentCount}: {rows.length}</strong>
              </div>

              {rows.length === 0 ? <p className="muted">{labels.noStudents}</p> : null}
            </>
          ) : null}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>{labels.close}</button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={!canExport} onClick={openPdfPrint}>{labels.pdf}</button>
            <button type="button" className="btn btn--primary btn--sm" disabled={!canExport || excelLoading} onClick={() => void downloadExcel()}>
              {excelLoading ? labels.loading : labels.excel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
