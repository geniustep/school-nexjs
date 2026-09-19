import type ExcelJS from 'exceljs';
import type { Locale } from '@/lib/i18n/config';
import type {
  ArrearsFollowupListItem,
  ArrearsGuardianDetail,
} from '@/types/finance-arrears';
import type {
  ArrearsExportContext,
  ArrearsExportResult,
} from '@/features/admin/finance/arrears-export';
import { arrearsReferenceLabel } from '@/features/admin/finance/utils/arrears-family-detail-present';

type DetailCopy = {
  sheets: { guardians: string; students: string; services: string };
  columns: {
    account: string; guardian: string; billingGuardian: string; student: string;
    studentCode: string; relationship: string; primaryContact: string;
    financialResponsible: string; legalGuardian: string; class: string; level: string;
    service: string; period: string; periodStart: string; periodEnd: string; dueDate: string;
    actionable: string; pending: string; gross: string;
  };
  yes: string;
  no: string;
  relationshipTypes: Record<string, string>;
};

const COPY: Record<Locale, DetailCopy> = {
  ar: {
    sheets: { guardians: 'أولياء الأمر', students: 'الأبناء', services: 'الخدمات المتأخرة' },
    columns: {
      account: 'الحساب / الأسرة', guardian: 'ولي الأمر', billingGuardian: 'ولي الحساب المالي',
      student: 'التلميذ', studentCode: 'رمز التلميذ', relationship: 'الصفة',
      primaryContact: 'الاتصال الرئيسي', financialResponsible: 'مسؤول مالي',
      legalGuardian: 'ولي قانوني', class: 'القسم', level: 'المستوى',
      service: 'الخدمة', period: 'الشهر / الفترة', periodStart: 'بداية الفترة',
      periodEnd: 'نهاية الفترة', dueDate: 'تاريخ الاستحقاق', actionable: 'المطلوب الآن',
      pending: 'شيك قيد التحصيل', gross: 'المتأخر الأصلي',
    },
    yes: 'نعم', no: 'لا',
    relationshipTypes: {
      father: 'الأب', mother: 'الأم', legal_guardian: 'ولي قانوني', grandfather: 'الجد',
      grandmother: 'الجدة', brother: 'الأخ', sister: 'الأخت', uncle: 'العم/الخال',
      aunt: 'العمة/الخالة', other: 'أخرى',
    },
  },
  fr: {
    sheets: { guardians: 'Responsables', students: 'Élèves', services: 'Services en retard' },
    columns: {
      account: 'Compte / famille', guardian: 'Responsable', billingGuardian: 'Responsable payeur',
      student: 'Élève', studentCode: 'Code élève', relationship: 'Lien',
      primaryContact: 'Contact principal', financialResponsible: 'Responsable financier',
      legalGuardian: 'Responsable légal', class: 'Classe', level: 'Niveau',
      service: 'Service', period: 'Mois / période', periodStart: 'Début période',
      periodEnd: 'Fin période', dueDate: 'Échéance', actionable: 'À encaisser maintenant',
      pending: 'Chèque en cours d’encaissement', gross: 'Impayé brut',
    },
    yes: 'Oui', no: 'Non',
    relationshipTypes: {
      father: 'Père', mother: 'Mère', legal_guardian: 'Responsable légal', grandfather: 'Grand-père',
      grandmother: 'Grand-mère', brother: 'Frère', sister: 'Sœur', uncle: 'Oncle',
      aunt: 'Tante', other: 'Autre',
    },
  },
  en: {
    sheets: { guardians: 'Guardians', students: 'Students', services: 'Overdue services' },
    columns: {
      account: 'Account / family', guardian: 'Guardian', billingGuardian: 'Billing guardian',
      student: 'Student', studentCode: 'Student code', relationship: 'Relationship',
      primaryContact: 'Primary contact', financialResponsible: 'Financially responsible',
      legalGuardian: 'Legal guardian', class: 'Class', level: 'Level',
      service: 'Service', period: 'Month / period', periodStart: 'Period start',
      periodEnd: 'Period end', dueDate: 'Due date', actionable: 'Due now',
      pending: 'Cheque pending', gross: 'Original overdue',
    },
    yes: 'Yes', no: 'No',
    relationshipTypes: {
      father: 'Father', mother: 'Mother', legal_guardian: 'Legal guardian', grandfather: 'Grandfather',
      grandmother: 'Grandmother', brother: 'Brother', sister: 'Sister', uncle: 'Uncle',
      aunt: 'Aunt', other: 'Other',
    },
  },
  es: {
    sheets: { guardians: 'Tutores', students: 'Alumnos', services: 'Servicios vencidos' },
    columns: {
      account: 'Cuenta / familia', guardian: 'Tutor', billingGuardian: 'Tutor pagador',
      student: 'Alumno', studentCode: 'Código alumno', relationship: 'Relación',
      primaryContact: 'Contacto principal', financialResponsible: 'Responsable financiero',
      legalGuardian: 'Tutor legal', class: 'Clase', level: 'Nivel',
      service: 'Servicio', period: 'Mes / período', periodStart: 'Inicio período',
      periodEnd: 'Fin período', dueDate: 'Vencimiento', actionable: 'A cobrar ahora',
      pending: 'Cheque pendiente', gross: 'Vencido original',
    },
    yes: 'Sí', no: 'No',
    relationshipTypes: {
      father: 'Padre', mother: 'Madre', legal_guardian: 'Tutor legal', grandfather: 'Abuelo',
      grandmother: 'Abuela', brother: 'Hermano', sister: 'Hermana', uncle: 'Tío',
      aunt: 'Tía', other: 'Otro',
    },
  },
};

function accountLabel(item: ArrearsFollowupListItem): string {
  return item.display_name ?? item.family_name ?? item.guardian_name ?? `#${item.family_id}`;
}
function studentName(item: ArrearsFollowupListItem, studentId: number): string {
  return item.students?.find((student) => student.student_id === studentId)?.student_name ?? `#${studentId}`;
}
function relationshipLabel(copy: DetailCopy, value?: string | null): string {
  if (!value) return '—';
  return copy.relationshipTypes[value] ?? value.replaceAll('_', ' ');
}
function booleanLabel(copy: DetailCopy, value?: boolean): string {
  return value ? copy.yes : copy.no;
}
function addHeader(sheet: ExcelJS.Worksheet, values: string[]): void {
  const row = sheet.addRow(values);
  row.font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}
function guardianRows(
  item: ArrearsFollowupListItem,
  guardian: ArrearsGuardianDetail,
  copy: DetailCopy,
): Array<Array<string | number | null>> {
  const contexts = guardian.relationship_contexts.length ? guardian.relationship_contexts : [null];
  return contexts.map((context) => [
    accountLabel(item),
    guardian.name ?? '—',
    booleanLabel(copy, guardian.is_billing_partner),
    context ? studentName(item, context.student_id) : '—',
    context ? relationshipLabel(copy, context.relationship_type) : '—',
    context ? booleanLabel(copy, context.is_primary_contact) : copy.no,
    context ? booleanLabel(copy, context.is_financial_responsible) : copy.no,
    context ? booleanLabel(copy, context.is_legal_guardian) : copy.no,
  ]);
}

export function appendArrearsFamilyDetailWorksheets(
  workbook: ExcelJS.Workbook,
  result: ArrearsExportResult,
  context: ArrearsExportContext,
): void {
  const copy = COPY[context.locale];

  const guardians = workbook.addWorksheet(copy.sheets.guardians);
  guardians.columns = [
    { width: 28 }, { width: 28 }, { width: 18 }, { width: 28 },
    { width: 18 }, { width: 18 }, { width: 20 }, { width: 18 },
  ];
  addHeader(guardians, [
    copy.columns.account, copy.columns.guardian, copy.columns.billingGuardian,
    copy.columns.student, copy.columns.relationship, copy.columns.primaryContact,
    copy.columns.financialResponsible, copy.columns.legalGuardian,
  ]);
  for (const item of result.items) {
    for (const guardian of item.guardians ?? []) {
      for (const values of guardianRows(item, guardian, copy)) guardians.addRow(values);
    }
  }

  const students = workbook.addWorksheet(copy.sheets.students);
  students.columns = [
    { width: 28 }, { width: 18 }, { width: 28 }, { width: 22 }, { width: 22 },
    { width: 18 }, { width: 18 }, { width: 18 },
  ];
  addHeader(students, [
    copy.columns.account, copy.columns.studentCode, copy.columns.student,
    copy.columns.class, copy.columns.level, copy.columns.actionable,
    copy.columns.pending, copy.columns.gross,
  ]);
  for (const item of result.items) {
    for (const student of item.students ?? []) {
      const row = students.addRow([
        accountLabel(item),
        student.student_code ?? '',
        student.student_name ?? '—',
        arrearsReferenceLabel(student.class),
        arrearsReferenceLabel(student.level),
        student.actionable_overdue_amount ?? null,
        student.pending_cheque_coverage_amount ?? null,
        student.gross_overdue_amount ?? null,
      ]);
      for (const cell of [6, 7, 8]) row.getCell(cell).numFmt = '#,##0.00';
    }
  }

  const services = workbook.addWorksheet(copy.sheets.services);
  services.columns = [
    { width: 28 }, { width: 18 }, { width: 28 }, { width: 28 }, { width: 16 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 18 },
  ];
  addHeader(services, [
    copy.columns.account, copy.columns.studentCode, copy.columns.student, copy.columns.service,
    copy.columns.period, copy.columns.periodStart, copy.columns.periodEnd, copy.columns.dueDate,
    copy.columns.actionable, copy.columns.pending, copy.columns.gross,
  ]);
  for (const item of result.items) {
    for (const installment of item.overdue_installments ?? []) {
      const row = services.addRow([
        accountLabel(item),
        installment.student_code ?? '',
        installment.student_name ?? studentName(item, installment.student_id),
        installment.fee_type_name ?? '—',
        installment.period_key ?? '',
        installment.period_start ?? '',
        installment.period_end ?? '',
        installment.due_date ?? '',
        installment.actionable_overdue_amount ?? null,
        installment.pending_cheque_coverage_amount ?? null,
        installment.gross_overdue_amount ?? null,
      ]);
      for (const cell of [9, 10, 11]) row.getCell(cell).numFmt = '#,##0.00';
    }
  }
}
