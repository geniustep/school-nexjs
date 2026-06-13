/**
 * Extended Student 360 fields — Live QA on database `school`.
 * Usage: node scripts/student-360-extended-live-qa.mjs
 */
import { loadAccountPassword, loadOdooTarget, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const HOST = 'school.raqeem.ma';
const BASE = `https://${HOST}`;
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const ts = Date.now();
const QA_NAME = `Student360 Extended QA ${ts}`;

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function bffLogin(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.success === true, jar: cookiesFrom(res), schoolId: body.data?.user?.active_school_id };
}

async function bffGet(jar, path) {
  const res = await fetch(`${BASE}/api/odoo${path}`, { headers: { Cookie: jar, Accept: 'application/json' } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function bffPost(jar, path, payload) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    method: 'POST',
    headers: { Cookie: jar, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const results = [];

function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function main() {
  console.log(`Extended Student 360 QA — bff=${HOST} db=school login=${LOGIN}`);
  const password = process.env.STUDENT_360_QA_PASSWORD?.trim() || loadAccountPassword(LOGIN);
  const auth = await bffLogin(LOGIN, password);
  record('bff_login', auth.ok);
  if (!auth.ok) {
    console.log(JSON.stringify({ status: 'BLOCKED_BY_AUTHENTICATION', results }, null, 2));
    process.exit(1);
  }

  const sq = auth.schoolId ? `?active_school_id=${auth.schoolId}` : '';
  const opts = await bffGet(auth.jar, `/admin/students/options${sq}`);
  const keys = Object.keys(opts.body.data ?? {});
  record('options', opts.body.success && keys.includes('gender') && keys.includes('nationalities'), { keys });

  const classes = opts.body.data?.classes ?? [];
  const classId = classes[0]?.id;
  const nationalityId = opts.body.data?.nationalities?.find((n) => n.code === 'MA')?.id ?? opts.body.data?.nationalities?.[0]?.id;

  const create = await bffPost(auth.jar, `/admin/students${sq}`, {
    first_name: 'Extended',
    last_name: `QA${ts}`,
    name_ar: 'تلميذ QA',
    name_latin: QA_NAME,
    code: `EXT${String(ts).slice(-6)}`,
    school_number: `SN${String(ts).slice(-8)}`,
    gender: 'male',
    date_of_birth: '2012-04-12',
    birth_place: 'Tangier',
    nationality_id: nationalityId,
    status: 'active',
    phone: `06${String(ts).slice(-8)}`,
    email: `extqa+${ts}@example.invalid`,
    street: 'Rue Test',
    district: 'Hay QA',
    city: 'Tangier',
    zip: '90000',
    emergency_contact_name: 'QA Uncle',
    emergency_relationship: 'other',
    emergency_phone: `07${String(ts).slice(-8)}`,
    admission_date: '2026-09-01',
    class_id: classId,
    enrollment: {
      registration_type: 'new',
      actual_join_date: '2026-09-01',
      is_repeating: false,
    },
  });
  const studentId = create.body.data?.id ?? create.body.data?.student?.id;
  record('create', create.status === 201 && !!studentId, { status: create.status, error: create.body.error?.code });

  if (!studentId) {
    console.log(JSON.stringify({ status: 'CODE_COMPLETE_QA_BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const details = await bffGet(auth.jar, `/admin/students/${studentId}${sq}`);
  const s = details.body.data?.student ?? {};
  record('details_extended', details.body.success && s.name_latin === QA_NAME && s.birth_place === 'Tangier', {
    has_nationality: !!s.nationality || !!s.nationality_id,
    has_enrollment: details.body.data?.current_enrollment != null,
  });

  const update = await bffPost(auth.jar, `/admin/students/${studentId}/update${sq}`, {
    district: 'Hay Riad Updated',
    phone: `06${String(ts).slice(-7)}1`,
  });
  record('partial_update', update.body.success, { error: update.body.error?.code });

  const after = await bffGet(auth.jar, `/admin/students/${studentId}${sq}`);
  const afterS = after.body.data?.student ?? {};
  record('partial_preserve', after.body.success && afterS.name_latin === QA_NAME, {
    district: afterS.district,
  });

  const badEmail = await bffPost(auth.jar, `/admin/students/${studentId}/update${sq}`, { email: 'not-an-email' });
  record('invalid_email_handled', !badEmail.body.success || badEmail.status === 422, {
    error: badEmail.body.error?.code,
  });

  const dupSchool = await bffPost(auth.jar, `/admin/students${sq}`, {
    first_name: 'Dup',
    last_name: `QA${ts}`,
    code: `EXT${String(ts).slice(-6)}`,
    class_id: classId,
  });
  record('duplicate_school_number', dupSchool.body.error?.code === 'duplicate_school_number', {
    status: dupSchool.status,
  });

  const badBirth = await bffPost(auth.jar, `/admin/students${sq}`, {
    first_name: 'Bad',
    last_name: `DOB${ts}`,
    code: `BD${String(ts).slice(-6)}`,
    date_of_birth: '2999-01-01',
    class_id: classId,
  });
  record('invalid_birth_date', badBirth.body.error?.code === 'invalid_birth_date', {
    status: badBirth.status,
  });

  const withdrawnMissing = await bffPost(auth.jar, `/admin/students${sq}`, {
    first_name: 'Wd',
    last_name: `QA${ts}`,
    code: `WD${String(ts).slice(-6)}`,
    status: 'withdrawn',
    class_id: classId,
  });
  record('withdrawn_requires_reason', !withdrawnMissing.body.success, {
    error: withdrawnMissing.body.error?.code,
  });

  const archive = await bffPost(auth.jar, `/admin/students/${studentId}/archive${sq}`, {});
  record('archive_cleanup', archive.body.success, { error: archive.body.error?.code });

  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'COMPLETED_LIVE_QA_PASSED' : 'CODE_COMPLETE_QA_BLOCKED',
        qa_database: 'school',
        studentId,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
