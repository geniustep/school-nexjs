import { STUDENT_IMPORT_TEMPLATE_VERSION } from './student-import-constants';
import type { StudentImportRowResult } from './student-import-types';
import type { StudentImportValidationRequest, StudentImportValidationRequestRow } from './student-import-server-types';

const PAYLOAD_FIELDS: Array<keyof StudentImportValidationRequestRow> = [
  'row_number',
  'first_name',
  'last_name',
  'name_ar',
  'name_latin',
  'gender',
  'date_of_birth',
  'birth_place',
  'nationality_id',
  'massar_code',
  'school_number',
  'status',
  'admission_date',
  'school_id',
  'academic_year_id',
  'level_id',
  'class_id',
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
];

function buildPayloadRow(row: StudentImportRowResult): StudentImportValidationRequestRow | null {
  if (row.errors.length > 0 || row.status === 'invalid') return null;
  const n = row.normalized;
  const payload: StudentImportValidationRequestRow = {
    row_number: row.rowNumber,
    first_name: n.first_name ?? '',
    last_name: n.last_name ?? '',
    school_number: n.school_number ?? '',
    school_id: n.school_id ?? undefined,
    academic_year_id: n.academic_year_id ?? undefined,
    level_id: n.level_id ?? undefined,
    class_id: n.class_id ?? undefined,
    registration_type: n.registration_type ?? undefined,
  };

  const optionalMap: Array<[keyof StudentImportValidationRequestRow, unknown]> = [
    ['name_ar', n.name_ar],
    ['name_latin', n.name_latin],
    ['gender', n.gender],
    ['date_of_birth', n.date_of_birth],
    ['birth_place', n.birth_place],
    ['nationality_id', n.nationality_id],
    ['massar_code', n.massar_code],
    ['status', n.status],
    ['admission_date', n.admission_date],
    ['actual_join_date', n.actual_join_date],
    ['previous_school', n.previous_school],
    ['is_repeating', n.is_repeating],
    ['registration_notes', n.registration_notes],
    ['phone', n.phone],
    ['mobile', n.mobile],
    ['email', n.email],
    ['street', n.street],
    ['district', n.district],
    ['city', n.city],
    ['zip', n.zip],
    ['emergency_contact_name', n.emergency_contact_name],
    ['emergency_relationship', n.emergency_relationship],
    ['emergency_phone', n.emergency_phone],
    ['emergency_phone_alt', n.emergency_phone_alt],
    ['emergency_notes', n.emergency_notes],
    ['departure_reason', n.departure_reason],
  ];

  for (const [key, value] of optionalMap) {
    if (value === undefined || value === '') continue;
    (payload as unknown as Record<string, unknown>)[key] = value;
  }

  return payload;
}

export function buildStudentImportValidationRequest(args: {
  activeSchoolId: number;
  sourceFilename: string;
  rows: StudentImportRowResult[];
}): StudentImportValidationRequest {
  const rows = args.rows
    .map(buildPayloadRow)
    .filter((row): row is StudentImportValidationRequestRow => row != null);

  return {
    template_version: STUDENT_IMPORT_TEMPLATE_VERSION,
    active_school_id: args.activeSchoolId,
    source_filename: args.sourceFilename,
    rows,
  };
}

export function assertValidationPayloadKeys(payload: StudentImportValidationRequest): void {
  for (const row of payload.rows) {
    for (const key of Object.keys(row)) {
      if (!PAYLOAD_FIELDS.includes(key as keyof StudentImportValidationRequestRow)) {
        throw new Error(`Unexpected import payload field: ${key}`);
      }
    }
  }
}

export function isValidationExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return true;
  const parsed = Date.parse(expiresAt.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed)) {
    const fallback = Date.parse(expiresAt);
    if (Number.isNaN(fallback)) return true;
    return fallback <= now;
  }
  return parsed <= now;
}

export function canExecuteImport(args: {
  localInvalidRows: number;
  serverInvalidRows: number;
  validationExpired: boolean;
  hasCapability: boolean;
  confirmed: boolean;
  phase: string;
}): boolean {
  if (!args.hasCapability) return false;
  if (args.validationExpired) return false;
  if (args.localInvalidRows > 0 || args.serverInvalidRows > 0) return false;
  if (args.phase !== 'confirming' && args.phase !== 'server_valid') return false;
  return args.confirmed;
}
