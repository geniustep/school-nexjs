'use client';

import { useMemo, useRef, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { buildGlobalAcademicYearQuery } from '@/features/academic-context/utils/global-academic-year-query';
import { useLocale } from '@/features/i18n/locale-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Level } from '@/types/class';
import type { Student } from '@/types/student';
import { buildStudentsListQueryParams } from '../utils/student-search-query';
import {
  collectCycleLevelIds,
  mergeStudentsById,
  STUDENTS_LIST_API_PAGE_SIZE_CAP,
  studentsListUsesClientCycleFilter,
} from '../utils/students-list-cycle-filter';
import type { StudentsListFilterValues } from '../utils/students-list-url';

type ColumnKey = 'number' | 'name' | 'schoolNumber' | 'massar' | 'level' | 'class' | 'gender' | 'birth' | 'phone' | 'address' | 'notes';
type GroupMode = 'single' | 'class';
type SortMode = 'name' | 'massar' | 'ageOldest' | 'ageYoungest';

type Labels = {
  title: string; filter: string; columns: string; resetColumns: string; number: string; name: string;
  schoolNumber: string; massar: string; level: string; className: string; gender: string; birth: string; phone: string; address: string;
  notes: string; male: string; female: string; pdf: string; excel: string; close: string; loading: string;
  empty: string; failed: string; popup: string; count: string; addColumn: string; noColumnsFound: string; moveBefore: string; moveAfter: string; remove: string;
  organization: string; oneRoster: string; byClass: string; sort: string; sortName: string; sortMassar: string; sortAgeOldest: string; sortAgeYoungest: string;
};

const labelsByLocale: Record<'ar' | 'fr' | 'en' | 'es', Labels> = {
  ar: { title: 'لائحة التلاميذ', filter: 'الفلاتر المعتمدة', columns: 'الأعمدة المطلوبة', resetColumns: 'إعادة الضبط', number: '#', name: 'اسم التلميذ', schoolNumber: 'رقم التلميذ', massar: 'رقم مسار', level: 'المستوى', className: 'القسم', gender: 'الجنس', birth: 'تاريخ الازدياد', phone: 'الهاتف', address: 'العنوان', notes: 'ملاحظات', male: 'ذكر', female: 'أنثى', pdf: 'PDF / طباعة', excel: 'Excel', close: 'إغلاق', loading: 'جارٍ تجهيز اللائحة…', empty: 'لا يوجد تلاميذ مطابقون للفلاتر الحالية.', failed: 'تعذر تجهيز اللائحة. أعد المحاولة.', popup: 'اسمح بالنوافذ المنبثقة ثم أعد المحاولة.', count: 'عدد التلاميذ', addColumn: 'أضف عمودًا…', noColumnsFound: 'لا توجد أعمدة مطابقة.', moveBefore: 'حرّك قبل', moveAfter: 'حرّك بعد', remove: 'حذف', organization: 'تنظيم اللائحة', oneRoster: 'لائحة واحدة', byClass: 'حسب القسم', sort: 'ترتيب التلاميذ', sortName: 'أبجديًا', sortMassar: 'حسب رقم مسار', sortAgeOldest: 'حسب السن: الأكبر أولًا', sortAgeYoungest: 'حسب السن: الأصغر أولًا' },
  fr: { title: 'Liste des élèves', filter: 'Filtres appliqués', columns: 'Colonnes souhaitées', resetColumns: 'Réinitialiser', number: '#', name: 'Nom de l’élève', schoolNumber: 'N° élève', massar: 'Code Massar', level: 'Niveau', className: 'Classe', gender: 'Sexe', birth: 'Date de naissance', phone: 'Téléphone', address: 'Adresse', notes: 'Observations', male: 'Garçon', female: 'Fille', pdf: 'PDF / Imprimer', excel: 'Excel', close: 'Fermer', loading: 'Préparation de la liste…', empty: 'Aucun élève ne correspond aux filtres actuels.', failed: 'Impossible de préparer la liste. Réessayez.', popup: 'Autorisez les fenêtres pop-up puis réessayez.', count: "Nombre d’élèves", addColumn: 'Ajouter une colonne…', noColumnsFound: 'Aucune colonne correspondante.', moveBefore: 'Déplacer avant', moveAfter: 'Déplacer après', remove: 'Supprimer', organization: 'Organisation', oneRoster: 'Liste unique', byClass: 'Par classe', sort: 'Trier les élèves', sortName: 'Alphabétique', sortMassar: 'Par code Massar', sortAgeOldest: 'Âge : plus âgés d’abord', sortAgeYoungest: 'Âge : plus jeunes d’abord' },
  en: { title: 'Student roster', filter: 'Applied filters', columns: 'Columns to include', resetColumns: 'Reset', number: '#', name: 'Student name', schoolNumber: 'Student number', massar: 'Massar code', level: 'Level', className: 'Class', gender: 'Gender', birth: 'Date of birth', phone: 'Phone', address: 'Address', notes: 'Notes', male: 'Male', female: 'Female', pdf: 'PDF / Print', excel: 'Excel', close: 'Close', loading: 'Preparing roster…', empty: 'No students match the current filters.', failed: 'Could not prepare the roster. Please try again.', popup: 'Allow pop-ups and try again.', count: 'Students', addColumn: 'Add a column…', noColumnsFound: 'No matching columns.', moveBefore: 'Move earlier', moveAfter: 'Move later', remove: 'Remove', organization: 'Roster organization', oneRoster: 'One roster', byClass: 'By class', sort: 'Student order', sortName: 'Alphabetical', sortMassar: 'By Massar code', sortAgeOldest: 'Age: oldest first', sortAgeYoungest: 'Age: youngest first' },
  es: { title: 'Lista de alumnos', filter: 'Filtros aplicados', columns: 'Columnas necesarias', resetColumns: 'Restablecer', number: '#', name: 'Nombre del alumno', schoolNumber: 'N.º de alumno', massar: 'Código Massar', level: 'Nivel', className: 'Clase', gender: 'Sexo', birth: 'Fecha de nacimiento', phone: 'Teléfono', address: 'Dirección', notes: 'Observaciones', male: 'Masculino', female: 'Femenino', pdf: 'PDF / Imprimir', excel: 'Excel', close: 'Cerrar', loading: 'Preparando la lista…', empty: 'Ningún alumno coincide con los filtros actuales.', failed: 'No se pudo preparar la lista. Inténtalo de nuevo.', popup: 'Permite las ventanas emergentes e inténtalo de nuevo.', count: 'Alumnos', addColumn: 'Añadir una columna…', noColumnsFound: 'No hay columnas coincidentes.', moveBefore: 'Mover antes', moveAfter: 'Mover después', remove: 'Eliminar', organization: 'Organización', oneRoster: 'Lista única', byClass: 'Por clase', sort: 'Orden de alumnos', sortName: 'Alfabético', sortMassar: 'Por código Massar', sortAgeOldest: 'Edad: mayores primero', sortAgeYoungest: 'Edad: menores primero' },
};

const DEFAULT_COLUMNS: ColumnKey[] = ['number', 'name', 'massar', 'birth', 'notes'];
const COLUMN_ORDER: ColumnKey[] = ['number', 'name', 'schoolNumber', 'massar', 'level', 'class', 'gender', 'birth', 'phone', 'address', 'notes'];

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] ?? char));
}

function birth(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value ?? '';
}

function filename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').trim() || 'students';
}

function columnLabel(labels: Labels, key: ColumnKey) {
  return labels[key === 'class' ? 'className' : key];
}

function getColumnValue(student: Student, key: ColumnKey, index: number, labels: Labels) {
  switch (key) {
    case 'number': return String(index + 1);
    case 'name': return getStudentDisplayName(student);
    case 'schoolNumber': return student.school_number ?? student.code ?? student.matricule ?? '';
    case 'massar': return student.massar_code ?? '';
    case 'level': return student.level?.name ?? '';
    case 'class': return student.class?.name ?? '';
    case 'gender': return student.gender === 'male' ? labels.male : student.gender === 'female' ? labels.female : '';
    case 'birth': return birth(student.date_of_birth);
    case 'phone': {
      const guardianPhones = (student.parents ?? [])
        .map((parent) => parent.phone?.trim())
        .filter((phone): phone is string => Boolean(phone));
      return student.phone?.trim() || Array.from(new Set(guardianPhones)).join(' · ');
    }
    case 'address': return student.residence_address ?? '';
    case 'notes': return '';
  }
}

function isLtrColumn(key: ColumnKey) {
  return key === 'number' || key === 'schoolNumber' || key === 'massar' || key === 'birth' || key === 'phone';
}

function compareStudents(a: Student, b: Student, sortMode: SortMode, locale: string) {
  const collationLocale = locale === 'ar' ? 'ar' : 'fr';
  if (sortMode === 'massar') return (a.massar_code ?? '').localeCompare(b.massar_code ?? '', collationLocale, { numeric: true }) || getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), collationLocale);
  if (sortMode === 'ageOldest' || sortMode === 'ageYoungest') {
    const aDate = a.date_of_birth ? Date.parse(a.date_of_birth) : Number.NaN;
    const bDate = b.date_of_birth ? Date.parse(b.date_of_birth) : Number.NaN;
    if (Number.isNaN(aDate) && Number.isNaN(bDate)) return getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), collationLocale);
    if (Number.isNaN(aDate)) return 1;
    if (Number.isNaN(bDate)) return -1;
    return sortMode === 'ageOldest' ? aDate - bDate : bDate - aDate;
  }
  return getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), collationLocale);
}

export function StudentsFilteredRosterExport({ filters, levels, filterDescription }: {
  filters: StudentsListFilterValues;
  levels: Level[];
  filterDescription: string;
}) {
  const { locale } = useLocale();
  const labels = labelsByLocale[locale === 'fr' || locale === 'en' || locale === 'es' ? locale : 'ar'];
  const toast = useToast();
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Student[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [columnSearch, setColumnSearch] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('single');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sorted = useMemo(() => [...rows].sort((a, b) => compareStudents(a, b, sortMode, locale)), [rows, sortMode, locale]);
  const columns = selectedColumns;
  const sections = useMemo(() => {
    if (groupMode === 'single') return [{ key: 'all', name: '', students: sorted }];
    const byClass = new Map<string, Student[]>();
    sorted.forEach((student) => {
      const name = student.class?.name || (locale === 'ar' ? 'دون قسم' : 'Unassigned');
      byClass.set(name, [...(byClass.get(name) ?? []), student]);
    });
    return Array.from(byClass.entries())
      .sort(([a], [b]) => a.localeCompare(b, locale === 'ar' ? 'ar' : 'fr'))
      .map(([name, students]) => ({ key: name, name, students }));
  }, [groupMode, locale, sorted]);
  const availableColumns = useMemo(() => {
    const search = columnSearch.trim().toLocaleLowerCase(locale);
    return COLUMN_ORDER.filter((key) => !selectedColumns.includes(key) && (!search || columnLabel(labels, key).toLocaleLowerCase(locale).includes(search)));
  }, [columnSearch, labels, locale, selectedColumns]);

  async function loadAll(levelId?: number) {
    const query = buildStudentsListQueryParams({ ...filters, levelId: levelId ? String(levelId) : filters.levelId, page: 1 });
    const all: Student[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await api.get<Student[]>(
        endpoints.admin.students,
        buildGlobalAcademicYearQuery(
          { ...query, page, page_size: STUDENTS_LIST_API_PAGE_SIZE_CAP, active_school_id: activeSchoolId ?? undefined },
          activeAcademicYearId,
        ),
      );
      if (!result.success) throw new Error('students_roster_failed');
      all.push(...result.data);
      totalPages = Math.max(1, result.meta.pagination?.total_pages ?? 1);
      page += 1;
    } while (page <= totalPages);
    return all;
  }

  async function open() {
    dialogRef.current?.showModal();
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const result = studentsListUsesClientCycleFilter(filters)
        ? mergeStudentsById(await Promise.all(collectCycleLevelIds(levels, filters.cycleCode).map((id) => loadAll(id))))
        : await loadAll();
      setRows(result);
    } catch {
      setError(labels.failed);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    dialogRef.current?.close();
  }

  function addColumn(key: ColumnKey) {
    setSelectedColumns((current) => current.includes(key) ? current : [...current, key]);
    setColumnSearch('');
  }

  function removeColumn(key: ColumnKey) {
    if (key === 'name') return;
    setSelectedColumns((current) => current.filter((item) => item !== key));
  }

  function moveColumn(key: ColumnKey, targetIndex: number) {
    setSelectedColumns((current) => {
      const sourceIndex = current.indexOf(key);
      if (sourceIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, key);
      return next;
    });
  }

  function print() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(labels.popup);
      return;
    }

    const headers = columns.map((key) => `<th>${esc(columnLabel(labels, key))}</th>`).join('');
    const sectionsHtml = sections.map((section, sectionIndex) => {
      const table = section.students.map((student, index) => `<tr>${columns.map((key) => {
        const direction = isLtrColumn(key) ? ' dir="ltr"' : '';
        return `<td${direction}>${esc(getColumnValue(student, key, index, labels))}</td>`;
      }).join('')}</tr>`).join('');
      const heading = groupMode === 'class' ? `<h2>${esc(labels.className)}: ${esc(section.name)} <small>(${section.students.length})</small></h2>` : '';
      return `<section class="roster-section ${sectionIndex ? 'roster-section--next' : ''}">${heading}<table><thead><tr>${headers}</tr></thead><tbody>${table}</tbody></table></section>`;
    }).join('');

    printWindow.document.write(`<!doctype html><html lang="${esc(locale)}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(labels.title)}</title><style>@page{size:A4 landscape;margin:11mm}body{font:12px Arial,Tahoma;color:#111827}.header{text-align:center;margin-bottom:10px}h1{margin:0 0 6px;font-size:20px}h2{font-size:15px;margin:0 0 8px}.filter{font-size:12px}table{width:100%;border-collapse:collapse;table-layout:auto}thead{display:table-header-group}th,td{border:1px solid #4b5563;padding:6px 7px;vertical-align:middle}th{background:#f3f4f6}td:nth-child(2){font-weight:600}tr{height:30px;page-break-inside:avoid}.roster-section--next{break-before:page;page-break-before:always}.footer{margin-top:7px;font-weight:700}</style></head><body><header class="header"><h1>${esc(labels.title)}</h1><div class="filter"><b>${esc(labels.filter)}:</b> ${esc(filterDescription)}</div></header>${sectionsHtml}<div class="footer">${esc(labels.count)}: ${sorted.length}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    window.setTimeout(() => printWindow.print(), 250);
  }

  async function excel() {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const endColumn = String.fromCharCode(64 + columns.length);
      sections.forEach((section, sectionIndex) => {
        const sheetName = groupMode === 'class' ? section.name.slice(0, 31) || `Class ${sectionIndex + 1}` : labels.title.slice(0, 31);
        const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: locale === 'ar', state: 'frozen', ySplit: 4 }] });
        sheet.columns = columns.map((key) => ({ width: key === 'name' ? 34 : key === 'address' || key === 'notes' ? 32 : 18 }));
        sheet.mergeCells(`A1:${endColumn}1`);
        sheet.getCell('A1').value = groupMode === 'class' ? `${labels.title} — ${section.name}` : labels.title;
        sheet.getCell('A1').font = { bold: true, size: 16 };
        sheet.getCell('A1').alignment = { horizontal: 'center' };
        sheet.mergeCells(`A2:${endColumn}2`);
        sheet.getCell('A2').value = `${labels.filter}: ${filterDescription}`;
        sheet.mergeCells(`A3:${endColumn}3`);
        sheet.getCell('A3').value = `${labels.count}: ${section.students.length}`;
        const header = sheet.getRow(4);
        header.values = columns.map((key) => columnLabel(labels, key));
        header.font = { bold: true };
        header.alignment = { horizontal: 'center', vertical: 'middle' };
        section.students.forEach((student, index) => sheet.addRow(columns.map((key) => getColumnValue(student, key, index, labels))));
        sheet.autoFilter = `A4:${endColumn}4`;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename(labels.title)}_${filename(filterDescription)}.xlsx`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(labels.failed);
    }
  }

  const ready = !loading && !error && sorted.length > 0 && columns.length > 0;

  return <>
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => void open()}>🖨️ {labels.title}</button>
    <dialog ref={dialogRef} onClose={close} style={{ width: 'min(92vw, 620px)', padding: 20, border: 'none', borderRadius: 16 }}>
      <div className="col" style={{ gap: 14 }}>
        <strong>{labels.title}</strong>
        <span className="muted tiny">{labels.filter}: {filterDescription}</span>
        <fieldset className="field" style={{ margin: 0 }}>
          <legend>{labels.columns}</legend>
          <div className="card" style={{ padding: 10, boxShadow: 'none' }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {columns.map((key, index) => <span
                key={key}
                draggable
                onDragStart={() => setDraggedColumn(key)}
                onDragEnd={() => setDraggedColumn(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedColumn) moveColumn(draggedColumn, index);
                  setDraggedColumn(null);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 6px', border: '1px solid var(--c-border)', borderRadius: 999, background: 'var(--c-surface-2)', cursor: 'grab' }}
              >
                <span aria-hidden="true">⠿</span>
                {columnLabel(labels, key)}
                <button type="button" className="btn btn--ghost btn--sm" disabled={index === 0} aria-label={labels.moveBefore} onClick={() => moveColumn(key, index - 1)}>↑</button>
                <button type="button" className="btn btn--ghost btn--sm" disabled={index === columns.length - 1} aria-label={labels.moveAfter} onClick={() => moveColumn(key, index + 1)}>↓</button>
                {key !== 'name' ? <button type="button" className="btn btn--ghost btn--sm" aria-label={labels.remove} onClick={() => removeColumn(key)}>×</button> : null}
              </span>)}
            </div>
            <input
              type="search"
              value={columnSearch}
              onChange={(event) => setColumnSearch(event.target.value)}
              placeholder={labels.addColumn}
              aria-label={labels.addColumn}
              style={{ width: '100%' }}
            />
            {columnSearch ? <div className="col" style={{ gap: 4, marginTop: 8 }}>
              {availableColumns.length ? availableColumns.map((key) => <button key={key} type="button" className="btn btn--ghost btn--sm" style={{ justifyContent: 'flex-start' }} onClick={() => addColumn(key)}>+ {columnLabel(labels, key)}</button>) : <span className="muted tiny">{labels.noColumnsFound}</span>}
            </div> : null}
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedColumns(DEFAULT_COLUMNS)} style={{ marginTop: 10 }}>{labels.resetColumns}</button>
        </fieldset>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          <label className="field">
            <span>{labels.organization}</span>
            <select value={groupMode} onChange={(event) => setGroupMode(event.target.value as GroupMode)}>
              <option value="single">{labels.oneRoster}</option>
              <option value="class">{labels.byClass}</option>
            </select>
          </label>
          <label className="field">
            <span>{labels.sort}</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="name">{labels.sortName}</option>
              <option value="massar">{labels.sortMassar}</option>
              <option value="ageOldest">{labels.sortAgeOldest}</option>
              <option value="ageYoungest">{labels.sortAgeYoungest}</option>
            </select>
          </label>
        </div>
        {loading ? <p className="muted">{labels.loading}</p> : null}
        {error ? <p className="muted">{error}</p> : null}
        {!loading && !error && !sorted.length ? <p className="muted">{labels.empty}</p> : null}
        {!loading && !error ? <strong>{labels.count}: {sorted.length}</strong> : null}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={close}>{labels.close}</button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={!ready} onClick={print}>{labels.pdf}</button>
          <button type="button" className="btn btn--primary btn--sm" disabled={!ready} onClick={() => void excel()}>{labels.excel}</button>
        </div>
      </div>
    </dialog>
  </>;
}
