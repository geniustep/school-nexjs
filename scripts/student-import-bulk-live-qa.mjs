/**
 * Student bulk import live QA (school database only).
 * Usage: node scripts/student-import-bulk-live-qa.mjs [bffBase]
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const base = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';

const report = {
  base,
  database: process.env.ODOO_DB,
  login: LOGIN,
  checks: [],
  cleanup: { archivedStudentIds: [], jobIds: [] },
  passed: true,
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function bffLogin(origin, login, password) {
  const res = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    ok: body.success === true,
    jar: cookiesFrom(res),
    user: body.data?.user ?? {},
    schoolId: body.data?.user?.active_school_id ?? body.data?.user?.schools?.[0]?.id ?? null,
  };
}

async function bff(path, jar, init = {}) {
  const res = await fetch(`${base}/api/odoo${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: jar,
      ...(init.headers ?? {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function bffBinary(path, jar, init = {}) {
  const res = await fetch(`${base}/api/odoo${path}`, {
    ...init,
    headers: {
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*',
      Cookie: jar,
      ...(init.headers ?? {}),
    },
  });
  const buffer = await res.arrayBuffer();
  return {
    status: res.status,
    contentType: res.headers.get('content-type') ?? '',
    disposition: res.headers.get('content-disposition') ?? '',
    buffer,
  };
}

async function readTemplateImportRef(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const meta = {};
  const metaSheet = workbook.getWorksheet('_SSC_Meta');
  if (metaSheet) {
    for (let r = 2; r <= metaSheet.rowCount; r++) {
      const key = String(metaSheet.getRow(r).getCell(1).value ?? '').trim();
      if (key) meta[key] = metaSheet.getRow(r).getCell(2).value;
    }
  }
  const classRow = workbook.getWorksheet('Ref_Classes')?.getRow(2);
  const guardianRow = workbook.getWorksheet('Ref_Guardians')?.getRow(2);
  const guardian =
    guardianRow &&
    Number.isFinite(Number(guardianRow.getCell(1).value)) &&
    String(guardianRow.getCell(2).value ?? '').trim() &&
    String(guardianRow.getCell(3).value ?? '').trim()
      ? {
          id: Number(guardianRow.getCell(1).value),
          name: String(guardianRow.getCell(2).value ?? '').trim(),
          mobile: String(guardianRow.getCell(3).value ?? '').trim(),
        }
      : null;
  return {
    schoolId: Number(meta.school_id) || null,
    yearId: Number(meta.academic_year_id) || null,
    classId: classRow ? Number(classRow.getCell(1).value) : null,
    levelId: (() => {
      const levelId = classRow ? Number(classRow.getCell(4).value) : NaN;
      return Number.isFinite(levelId) ? levelId : null;
    })(),
    guardian,
  };
}

function mergeImportRef(optionsRef, templateRef) {
  const merged = { ...optionsRef };
  if (templateRef.schoolId != null) merged.schoolId = templateRef.schoolId;
  if (templateRef.yearId != null) merged.yearId = templateRef.yearId;
  if (templateRef.classId != null) merged.classId = templateRef.classId;
  if (Number.isFinite(templateRef.levelId)) {
    merged.levelId = templateRef.levelId;
  } else if (templateRef.classId != null) {
    merged.levelId = undefined;
  }
  return merged;
}

function buildGuardianFields(guardian) {
  if (!guardian) return {};
  return {
    guardian_id: guardian.id,
    guardian_name: guardian.name,
    guardian_mobile: guardian.mobile,
    guardian_relationship_type: 'father',
    guardian_is_primary_contact: true,
    guardian_is_financial_responsible: true,
  };
}

async function buildWorkbookRows(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  ws.addRow(['template_version', 1]);
  ws.addRow([
    'first_name',
    'last_name',
    'school_number',
    'school_code',
    'academic_year_code',
    'level_code',
    'class_code',
    'registration_type',
  ]);
  for (const row of rows) ws.addRow(row);
  return wb.xlsx.writeBuffer();
}

function pickRef(options, schoolId) {
  const school = (options.schools ?? []).find((s) => s.id === schoolId) ?? options.schools?.[0];
  const year = options.academic_years?.[0];
  const cls =
    (options.classes ?? []).find((c) => c.level?.id != null) ?? (options.classes ?? [])[0];
  const level =
    (options.levels ?? []).find((l) => l.id === cls?.level?.id) ?? cls?.level ?? (options.levels ?? [])[0];
  return {
    schoolCode: school?.code ?? String(school?.id ?? schoolId),
    yearCode: year?.code ?? String(year?.id ?? '1'),
    levelCode: level?.code ?? String(level?.id ?? '176'),
    classCode: cls?.code ?? String(cls?.id ?? '2059'),
    schoolId: school?.id ?? schoolId,
    yearId: year?.id ?? 1,
    levelId: level?.id ?? cls?.level?.id ?? 176,
    classId: cls?.id ?? 2059,
  };
}

function validationPayload(ref, filename, rows, guardian) {
  const guardianFields = buildGuardianFields(guardian);
  return {
    template_version: 1,
    active_school_id: ref.schoolId,
    source_filename: filename,
    rows: rows.map((r, i) => {
      const row = {
        row_number: 3 + i,
        first_name: r.first_name,
        last_name: r.last_name,
        school_number: r.school_number,
        school_id: ref.schoolId,
        academic_year_id: ref.yearId,
        class_id: ref.classId,
        registration_type: 'new',
        status: 'active',
        ...guardianFields,
      };
      if (Number.isFinite(ref.levelId)) row.level_id = ref.levelId;
      return row;
    }),
  };
}

try {
  const password = process.env.STUDENT_360_QA_PASSWORD?.trim() || loadAccountPassword(LOGIN);
  const auth = await bffLogin(base, LOGIN, password);
  check('login', auth.ok, base);
  if (!auth.ok) throw new Error('login_failed');

  const caps = auth.user.effective_capabilities ?? [];
  check('capability_students_import', caps.includes('students.import'), caps.join(', '));

  const sq = auth.schoolId ? `?active_school_id=${auth.schoolId}` : '';
  const templateRes = await bffBinary(`/admin/students/import/template${sq}`, auth.jar);
  check('template_download_status', templateRes.status === 200, String(templateRes.status));
  const templateBytes = new Uint8Array(templateRes.buffer);
  const looksLikeXlsx =
    templateBytes.length >= 2 && templateBytes[0] === 0x50 && templateBytes[1] === 0x4b;
  check(
    'template_download_binary',
    looksLikeXlsx ||
      templateRes.contentType.includes('spreadsheetml') ||
      templateRes.contentType.includes('octet-stream') ||
      templateRes.disposition.toLowerCase().includes('attachment'),
    `${templateRes.contentType} ${templateRes.disposition}`,
  );

  const templateRef = await readTemplateImportRef(templateRes.buffer);
  const guardian = templateRef.guardian;
  check('guardian_ref', guardian != null, guardian ? `id=${guardian.id}` : 'missing Ref_Guardians');
  if (!guardian) throw new Error('guardian_ref_missing');

  const optionsRes = await bff(`/admin/students/options${sq}`, auth.jar);
  check('students_options', optionsRes.body.success === true);
  const ref = mergeImportRef(pickRef(optionsRes.body.data ?? {}, auth.schoolId), templateRef);

  const suffix = Date.now().toString(36);
  const dupNumber = `QA-BULK-DUP-${suffix}`;
  const validNumber = `QA-BULK-VAL-${suffix}`;
  const invalidNumber = `QA-BULK-BAD-${suffix}`;
  const executeNumber = `QA-BULK-EXEC-${suffix}`;

  const validationRows = [
    { first_name: 'Valid', last_name: 'Row', school_number: validNumber },
    { first_name: 'Dup', last_name: 'Row', school_number: dupNumber },
    { first_name: 'Invalid', last_name: 'Row', school_number: invalidNumber },
  ];

  const validatePayload = validationPayload(ref, 'qa-validation.xlsx', validationRows, guardian);
  for (const row of validatePayload.rows) {
    row.class_id = 99999999;
  }

  const validateRes = await bff('/admin/students/import/validate', auth.jar, {
    method: 'POST',
    body: JSON.stringify(validatePayload),
  });
  check('validate_status', validateRes.status === 200, String(validateRes.status));
  check('validate_success', validateRes.body.success === true);
  const jobId = validateRes.body.data?.job_id;
  check('validate_job_id', typeof jobId === 'number', String(jobId));
  check(
    'validate_invalid_rows',
    (validateRes.body.data?.summary?.invalid_rows ?? 0) >= 1,
    JSON.stringify(validateRes.body.data?.summary ?? {}),
  );
  check(
    'validate_no_valid_rows',
    (validateRes.body.data?.summary?.valid_rows ?? 0) === 0,
    JSON.stringify(validateRes.body.data?.summary ?? {}),
  );
  if (jobId) report.cleanup.jobIds.push(jobId);

  const blockedExecute = await bff(`/admin/students/import/${jobId}/execute`, auth.jar, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: randomUUID() }),
  });
  check(
    'execute_blocked_on_invalid',
    blockedExecute.body.success === false ||
      (blockedExecute.body.data?.summary?.created_rows ?? 0) === 0,
    blockedExecute.body.error?.code ?? blockedExecute.body.data?.state ?? 'unexpected',
  );

  const successPayload = validationPayload(ref, 'qa-success.xlsx', [
    { first_name: 'Bulk', last_name: 'Success', school_number: executeNumber },
  ], guardian);
  const validateOk = await bff('/admin/students/import/validate', auth.jar, {
    method: 'POST',
    body: JSON.stringify(successPayload),
  });
  check('validate_success_file', validateOk.body.success === true);
  const execJobId = validateOk.body.data?.job_id;
  if (execJobId) report.cleanup.jobIds.push(execJobId);

  const idempotencyKey = randomUUID();
  const executeRes = await bff(`/admin/students/import/${execJobId}/execute`, auth.jar, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  });
  check('execute_success', executeRes.body.success === true, executeRes.body.error?.code);
  check(
    'execute_state',
    ['completed', 'completed_with_errors'].includes(executeRes.body.data?.state),
    executeRes.body.data?.state,
  );

  const executeDup = await bff(`/admin/students/import/${execJobId}/execute`, auth.jar, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  });
  check('idempotency_no_duplicate', executeDup.body.success === true, executeDup.body.error?.code);
  const created1 = executeRes.body.data?.summary?.created_rows ?? 0;
  const created2 = executeDup.body.data?.summary?.created_rows ?? 0;
  check('idempotency_same_created_count', created1 === created2, `${created1} vs ${created2}`);

  const jobStatus = await bff(`/admin/students/import/${execJobId}?page=1&limit=20`, auth.jar);
  check('job_status', jobStatus.body.success === true, jobStatus.body.data?.state ?? jobStatus.body.data?.job?.state);

  const createdIds = [
    ...(executeRes.body.data?.rows ?? []),
    ...(jobStatus.body.data?.rows ?? []),
    ...(blockedExecute.body.data?.rows ?? []),
  ]
    .filter((r) => r.status === 'created' && r.student_id)
    .map((r) => r.student_id);

  for (const studentId of [...new Set(createdIds)]) {
    const archive = await bff(`/admin/students/${studentId}/archive`, auth.jar, { method: 'POST', body: '{}' });
    check(`archive_${studentId}`, archive.body.success === true, archive.body.error?.code);
    if (archive.body.success) report.cleanup.archivedStudentIds.push(studentId);
  }
} catch (error) {
  check('runtime', false, error instanceof Error ? error.message : String(error));
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
