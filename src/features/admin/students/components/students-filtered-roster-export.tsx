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
import { collectCycleLevelIds, mergeStudentsById, STUDENTS_LIST_API_PAGE_SIZE_CAP, studentsListUsesClientCycleFilter } from '../utils/students-list-cycle-filter';
import type { StudentsListFilterValues } from '../utils/students-list-url';

type Labels = { title: string; filter: string; number: string; name: string; massar: string; birth: string; notes: string; pdf: string; excel: string; close: string; loading: string; empty: string; failed: string; popup: string };
const labelsByLocale: Record<'ar' | 'fr' | 'en' | 'es', Labels> = {
  ar: { title: 'لائحة التلاميذ', filter: 'الفلاتر المعتمدة', number: '#', name: 'اسم التلميذ', massar: 'رقم مسار', birth: 'تاريخ الازدياد', notes: 'ملاحظات', pdf: 'PDF / طباعة', excel: 'Excel', close: 'إغلاق', loading: 'جارٍ تجهيز اللائحة…', empty: 'لا يوجد تلاميذ مطابقون للفلاتر الحالية.', failed: 'تعذر تجهيز اللائحة. أعد المحاولة.', popup: 'اسمح بالنوافذ المنبثقة ثم أعد المحاولة.' },
  fr: { title: 'Liste des élèves', filter: 'Filtres appliqués', number: '#', name: "Nom de l’élève", massar: 'Code Massar', birth: 'Date de naissance', notes: 'Observations', pdf: 'PDF / Imprimer', excel: 'Excel', close: 'Fermer', loading: 'Préparation de la liste…', empty: 'Aucun élève ne correspond aux filtres actuels.', failed: 'Impossible de préparer la liste. Réessayez.', popup: 'Autorisez les fenêtres pop-up puis réessayez.' },
  en: { title: 'Student roster', filter: 'Applied filters', number: '#', name: 'Student name', massar: 'Massar code', birth: 'Date of birth', notes: 'Notes', pdf: 'PDF / Print', excel: 'Excel', close: 'Close', loading: 'Preparing roster…', empty: 'No students match the current filters.', failed: 'Could not prepare the roster. Please try again.', popup: 'Allow pop-ups and try again.' },
  es: { title: 'Lista de alumnos', filter: 'Filtros aplicados', number: '#', name: 'Nombre del alumno', massar: 'Código Massar', birth: 'Fecha de nacimiento', notes: 'Observaciones', pdf: 'PDF / Imprimir', excel: 'Excel', close: 'Cerrar', loading: 'Preparando la lista…', empty: 'Ningún alumno coincide con los filtros actuales.', failed: 'No se pudo preparar la lista. Inténtalo de nuevo.', popup: 'Permite las ventanas emergentes e inténtalo de nuevo.' },
};
function esc(value: string) { return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] ?? c)); }
function birth(value: string | null) { const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : value ?? ''; }
function filename(value: string) { return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').trim() || 'students'; }

export function StudentsFilteredRosterExport({ filters, levels, filterDescription }: { filters: StudentsListFilterValues; levels: Level[]; filterDescription: string }) {
  const { locale } = useLocale();
  const labels = labelsByLocale[locale === 'fr' || locale === 'en' || locale === 'es' ? locale : 'ar'];
  const toast = useToast();
  const { activeSchoolId, activeAcademicYearId } = useAdminSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sorted = useMemo(() => [...rows].sort((a, b) => getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), locale === 'ar' ? 'ar' : 'fr')), [rows, locale]);

  async function loadAll(levelId?: number) {
    const query = buildStudentsListQueryParams({ ...filters, levelId: levelId ? String(levelId) : filters.levelId, page: 1 });
    const all: Student[] = []; let page = 1; let totalPages = 1;
    do {
      const result = await api.get<Student[]>(endpoints.admin.students, buildGlobalAcademicYearQuery({ ...query, page, page_size: STUDENTS_LIST_API_PAGE_SIZE_CAP, active_school_id: activeSchoolId ?? undefined }, activeAcademicYearId));
      if (!result.success) throw new Error('students_roster_failed');
      all.push(...result.data); totalPages = Math.max(1, result.meta.pagination?.total_pages ?? 1); page += 1;
    } while (page <= totalPages);
    return all;
  }

  async function open() {
    dialogRef.current?.showModal(); setLoading(true); setError(null); setRows([]);
    try {
      const result = studentsListUsesClientCycleFilter(filters)
        ? mergeStudentsById(await Promise.all(collectCycleLevelIds(levels, filters.cycleCode).map((id) => loadAll(id))))
        : await loadAll();
      setRows(result);
    } catch { setError(labels.failed); } finally { setLoading(false); }
  }
  function close() { dialogRef.current?.close(); }
  function print() {
    const w = window.open('', '_blank'); if (!w) { toast.error(labels.popup); return; }
    const table = sorted.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(getStudentDisplayName(s))}</td><td dir="ltr">${esc(s.massar_code ?? '')}</td><td dir="ltr">${esc(birth(s.date_of_birth))}</td><td></td></tr>`).join('');
    w.document.write(`<!doctype html><html lang="${esc(locale)}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(labels.title)}</title><style>@page{size:A4 landscape;margin:11mm}body{font:12px Arial,Tahoma;color:#111827}.header{text-align:center;margin-bottom:10px}h1{margin:0 0 6px;font-size:20px}.filter{font-size:12px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th,td{border:1px solid #4b5563;padding:6px 7px}th{background:#f3f4f6}td:first-child{width:5%;text-align:center}td:nth-child(2){width:33%;font-weight:600}td:nth-child(3),td:nth-child(4){width:16%;text-align:center}td:last-child{width:30%}tr{height:30px;page-break-inside:avoid}</style></head><body><header class="header"><h1>${esc(labels.title)}</h1><div class="filter"><b>${esc(labels.filter)}:</b> ${esc(filterDescription)}</div></header><table><thead><tr><th>${esc(labels.number)}</th><th>${esc(labels.name)}</th><th>${esc(labels.massar)}</th><th>${esc(labels.birth)}</th><th>${esc(labels.notes)}</th></tr></thead><tbody>${table}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.onafterprint = () => w.close(); window.setTimeout(() => w.print(), 250);
  }
  async function excel() {
    try {
      const ExcelJS = await import('exceljs'); const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet(labels.title.slice(0, 31), { views: [{ rightToLeft: locale === 'ar', state: 'frozen', ySplit: 4 }] });
      sheet.columns = [{ width: 7 }, { width: 34 }, { width: 20 }, { width: 17 }, { width: 32 }]; sheet.mergeCells('A1:E1'); sheet.getCell('A1').value = labels.title; sheet.getCell('A1').font = { bold: true, size: 16 }; sheet.getCell('A1').alignment = { horizontal: 'center' }; sheet.mergeCells('A2:E2'); sheet.getCell('A2').value = `${labels.filter}: ${filterDescription}`; sheet.mergeCells('A3:E3'); sheet.getCell('A3').value = `${sorted.length}`;
      const header = sheet.getRow(4); header.values = [labels.number, labels.name, labels.massar, labels.birth, labels.notes]; header.font = { bold: true }; header.alignment = { horizontal: 'center' };
      sorted.forEach((s, i) => sheet.addRow([i + 1, getStudentDisplayName(s), s.massar_code ?? '', birth(s.date_of_birth), ''])); sheet.autoFilter = 'A4:E4';
      const buffer = await book.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); const a = document.createElement('a'); a.href = url; a.download = `${filename(labels.title)}_${filename(filterDescription)}.xlsx`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error(labels.failed); }
  }
  const ready = !loading && !error && sorted.length > 0;
  return <><button type="button" className="btn btn--ghost btn--sm" onClick={() => void open()}>🖨️ {labels.title}</button><dialog ref={dialogRef} onClose={close} style={{ width: 'min(92vw, 520px)', padding: 20, border: 'none', borderRadius: 16 }}><div className="col" style={{ gap: 14 }}><strong>{labels.title}</strong><span className="muted tiny">{labels.filter}: {filterDescription}</span>{loading ? <p className="muted">{labels.loading}</p> : null}{error ? <p className="muted">{error}</p> : null}{!loading && !error && !sorted.length ? <p className="muted">{labels.empty}</p> : null}{!loading && !error ? <strong>{sorted.length}</strong> : null}<div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><button type="button" className="btn btn--ghost btn--sm" onClick={close}>{labels.close}</button><button type="button" className="btn btn--ghost btn--sm" disabled={!ready} onClick={print}>{labels.pdf}</button><button type="button" className="btn btn--primary btn--sm" disabled={!ready} onClick={() => void excel()}>{labels.excel}</button></div></div></dialog></>;
}
