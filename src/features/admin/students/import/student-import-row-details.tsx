'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { STUDENT_IMPORT_COLUMNS } from './student-import-columns';
import type { StudentImportNormalizedRow, StudentImportRowResult } from './student-import-types';
import { fullStudentImportName } from './student-import-v2-contract';

const NORMALIZED_DETAIL_KEYS = [
  'first_name',
  'last_name',
  'name_ar',
  'name_latin',
  'gender',
  'date_of_birth',
  'birth_place',
  'nationality_code',
  'massar_code',
  'school_number',
  'status',
  'admission_date',
  'school_code',
  'academic_year_code',
  'level_code',
  'class_code',
  'registration_type',
  'actual_join_date',
  'previous_school',
  'is_repeating',
  'registration_notes',
  'phone',
  'mobile',
  'email',
  'street',
  'district',
  'city',
  'zip',
  'emergency_contact_name',
  'emergency_relationship',
  'emergency_phone',
  'emergency_phone_alt',
  'emergency_notes',
  'departure_reason',
  'guardian_id',
  'guardian_name',
  'guardian_mobile',
  'guardian_relationship_type',
  'guardian_is_legal_guardian',
  'guardian_is_primary_contact',
  'guardian_is_financial_responsible',
] as const;

const LEGACY_LABEL_KEYS = new Map(STUDENT_IMPORT_COLUMNS.map((column) => [column.key, column.labelKey]));

export function normalizedStudentImportDetailValue(
  row: StudentImportRowResult,
  key: (typeof NORMALIZED_DETAIL_KEYS)[number],
): unknown {
  const normalized = row.normalized;
  const raw = row.raw;

  switch (key) {
    case 'name_ar':
      return fullStudentImportName(normalized.first_name_ar, normalized.last_name_ar) ?? normalized.name_ar ?? null;
    case 'name_latin':
      return fullStudentImportName(normalized.first_name_fr, normalized.last_name_fr) ?? normalized.name_latin ?? null;
    case 'school_code':
      return raw.school_label ?? normalized.school_code ?? normalized.school_id ?? null;
    case 'academic_year_code':
      return raw.academic_year_label ?? normalized.academic_year_code ?? normalized.academic_year_id ?? null;
    case 'level_code':
      return raw.level_label ?? normalized.level_code ?? normalized.level_id ?? null;
    case 'class_code':
      return raw.class_label ?? normalized.class_code ?? normalized.class_id ?? null;
    default:
      return normalized[key as keyof StudentImportNormalizedRow] ?? null;
  }
}

export function rawStudentImportDetailEntries(raw: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(raw).filter(([, value]) => value !== undefined);
}

function detailValue(value: unknown, dash: string): string {
  if (value == null || value === '') return dash;
  if (value === true) return 'true';
  if (value === false) return 'false';
  return String(value);
}

export function StudentImportRowDetails({
  row,
  onClose,
}: {
  row: StudentImportRowResult | null;
  onClose: () => void;
}) {
  const t = useT();
  if (!row) return null;

  return (
    <div className="student-import-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="student-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.studentImport.rowDetails.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="student-import-dialog__header">
          <h2>{t('admin.studentImport.rowDetails.title', { row: row.rowNumber })}</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>

        <Card>
          <SectionHead title={t('admin.studentImport.rowDetails.normalized')} />
          <DefinitionList
            items={NORMALIZED_DETAIL_KEYS.map((key) => ({
              label: LEGACY_LABEL_KEYS.has(key) ? t(LEGACY_LABEL_KEYS.get(key)!) : key,
              value: detailValue(normalizedStudentImportDetailValue(row, key), t('common.dash')),
            }))}
          />
        </Card>

        <Card>
          <SectionHead title={t('admin.studentImport.rowDetails.raw')} />
          <DefinitionList
            items={rawStudentImportDetailEntries(row.raw).map(([key, value]) => ({
              label: key,
              value: detailValue(value, t('common.dash')),
            }))}
          />
        </Card>

        {(row.errors.length > 0 || row.warnings.length > 0) && (
          <Card>
            <SectionHead title={t('admin.studentImport.rowDetails.issues')} />
            <div className="col" style={{ gap: 8 }}>
              {row.errors.map((issue, index) => (
                <div key={`e-${index}`} className="tiny" style={{ color: 'var(--danger)' }}>
                  [{issue.code}] {issue.message}
                </div>
              ))}
              {row.warnings.map((issue, index) => (
                <div key={`w-${index}`} className="tiny" style={{ color: 'var(--warning, #b45309)' }}>
                  [{issue.code}] {issue.message}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
