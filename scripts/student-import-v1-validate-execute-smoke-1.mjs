/**
 * Short smoke: official v1 validate → execute (school database only).
 * Usage: node scripts/student-import-v1-validate-execute-smoke-1.mjs [bffBase]
 */
import { randomUUID } from 'node:crypto';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const base = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';

const report = { base, database: process.env.ODOO_DB, login: LOGIN, checks: [], passed: true };

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

function pickRef(options, schoolId) {
  const school = (options.schools ?? []).find((s) => s.id === schoolId) ?? options.schools?.[0];
  const year = options.academic_years?.[0];
  const cls =
    (options.classes ?? []).find((c) => c.level?.id != null) ?? (options.classes ?? [])[0];
  const level =
    (options.levels ?? []).find((l) => l.id === cls?.level?.id) ?? cls?.level ?? (options.levels ?? [])[0];
  return {
    schoolId: school?.id ?? schoolId,
    yearId: year?.id ?? 1,
    levelId: level?.id ?? cls?.level?.id ?? 176,
    classId: cls?.id ?? 2059,
  };
}

function validationPayload(ref, filename, rows) {
  return {
    template_version: 1,
    active_school_id: ref.schoolId,
    source_filename: filename,
    rows: rows.map((r, i) => ({
      row_number: 3 + i,
      first_name: r.first_name,
      last_name: r.last_name,
      school_number: r.school_number,
      school_id: ref.schoolId,
      academic_year_id: ref.yearId,
      level_id: ref.levelId,
      class_id: ref.classId,
      registration_type: 'new',
      status: 'active',
    })),
  };
}

try {
  const password = process.env.STUDENT_360_QA_PASSWORD?.trim() || loadAccountPassword(LOGIN);
  const auth = await bffLogin(base, LOGIN, password);
  check('login', auth.ok, base);
  if (!auth.ok) throw new Error('login_failed');

  const sq = auth.schoolId ? `?active_school_id=${auth.schoolId}` : '';
  const optionsRes = await bff(`/admin/students/options${sq}`, auth.jar);
  check('students_options', optionsRes.body.success === true);
  const ref = pickRef(optionsRes.body.data ?? {}, auth.schoolId);

  const suffix = Date.now().toString(36);
  const invalidNumber = `QA-V1-BAD-${suffix}`;
  const executeNumber = `QA-V1-EXEC-${suffix}`;

  const invalidPayload = validationPayload(ref, 'qa-v1-invalid.xlsx', [
    { first_name: 'Bad', last_name: 'Row', school_number: invalidNumber },
  ]);
  invalidPayload.rows[0].class_id = 99999999;

  const validateInvalid = await bff('/admin/students/import/validate', auth.jar, {
    method: 'POST',
    body: JSON.stringify(invalidPayload),
  });
  check('validate_invalid_success', validateInvalid.body.success === true);
  const invalidJobId = validateInvalid.body.data?.job_id;
  check('validate_invalid_job_id', typeof invalidJobId === 'number', String(invalidJobId));
  check(
    'validate_invalid_rows_gt_zero',
    (validateInvalid.body.data?.summary?.invalid_rows ?? 0) > 0,
    JSON.stringify(validateInvalid.body.data?.summary ?? {}),
  );

  const blockedExecute = await bff(`/admin/students/import/${invalidJobId}/execute`, auth.jar, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: randomUUID() }),
  });
  check(
    'execute_blocked_on_invalid_rows',
    blockedExecute.body.success === false ||
      (blockedExecute.body.data?.summary?.created_rows ?? 0) === 0,
    blockedExecute.body.error?.code ?? blockedExecute.body.data?.state ?? 'unexpected',
  );

  const validPayload = validationPayload(ref, 'qa-v1-success.xlsx', [
    { first_name: 'V1', last_name: 'Execute', school_number: executeNumber },
  ]);
  const validateOk = await bff('/admin/students/import/validate', auth.jar, {
    method: 'POST',
    body: JSON.stringify(validPayload),
  });
  check('validate_ok', validateOk.body.success === true);
  const jobId = validateOk.body.data?.job_id;
  check('validate_ok_job_id', typeof jobId === 'number', String(jobId));
  check(
    'validate_ok_no_invalid_rows',
    (validateOk.body.data?.summary?.invalid_rows ?? 0) === 0,
    JSON.stringify(validateOk.body.data?.summary ?? {}),
  );

  const idempotencyKey = randomUUID();
  const executeRes = await bff(`/admin/students/import/${jobId}/execute`, auth.jar, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  });
  check('execute_success', executeRes.body.success === true, executeRes.body.error?.code);
  check(
    'execute_terminal_state',
    ['completed', 'completed_with_errors'].includes(executeRes.body.data?.state),
    executeRes.body.data?.state,
  );
  check(
    'execute_summary_present',
    typeof executeRes.body.data?.summary?.created_rows === 'number' ||
      typeof executeRes.body.data?.summary?.failed_rows === 'number' ||
      typeof executeRes.body.data?.summary?.skipped_rows === 'number',
    JSON.stringify(executeRes.body.data?.summary ?? {}),
  );

  const executeDup = await bff(`/admin/students/import/${jobId}/execute`, auth.jar, {
    method: 'POST',
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  });
  check('idempotency_reuse_ok', executeDup.body.success === true, executeDup.body.error?.code);
  check(
    'idempotency_same_created_count',
    (executeRes.body.data?.summary?.created_rows ?? 0) ===
      (executeDup.body.data?.summary?.created_rows ?? 0),
    `${executeRes.body.data?.summary?.created_rows} vs ${executeDup.body.data?.summary?.created_rows}`,
  );

  const createdIds = (executeRes.body.data?.rows ?? [])
    .filter((r) => r.status === 'created' && r.student_id)
    .map((r) => r.student_id);
  for (const studentId of [...new Set(createdIds)]) {
    const archive = await bff(`/admin/students/${studentId}/archive`, auth.jar, {
      method: 'POST',
      body: '{}',
    });
    check(`archive_${studentId}`, archive.body.success === true, archive.body.error?.code);
  }
} catch (error) {
  check('runtime', false, error instanceof Error ? error.message : String(error));
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
