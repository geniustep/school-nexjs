/**
 * Student 360 — full Live QA on database `school` via Next.js BFF.
 *
 * Usage:
 *   STUDENT_360_QA_LOGIN=done STUDENT_360_QA_PASSWORD=*** node scripts/student-360-live-qa.mjs
 *
 * Env (see qa-env.mjs): STUDENT_360_QA_HOST, STUDENT_360_QA_LOGIN, STUDENT_360_QA_PASSWORD, ODOO_DB_QA=school
 * Never prints passwords, cookies, or PII.
 */
import { loadAccountPassword, loadOdooTarget, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const ODOO_HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
/** app.propanel.ma is Odoo-only; Next.js BFF for `school` tenant is school.raqeem.ma */
const HOST = ODOO_HOST.includes('propanel.ma') ? 'school.raqeem.ma' : ODOO_HOST;
const BASE = `https://${HOST}`;
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const QA_PREFIX = 'Student360 QA Guardian';
const ts = Date.now();

function resolvePassword() {
  if (process.env.STUDENT_360_QA_PASSWORD?.trim()) {
    return process.env.STUDENT_360_QA_PASSWORD.trim();
  }
  return loadAccountPassword(LOGIN);
}

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function odooAuthSchool(login, password) {
  const target = loadOdooTarget();
  const res = await fetch(`${target.odooBaseUrl}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'call',
      params: { db: 'school', login, password },
    }),
  });
  const json = await res.json().catch(() => ({}));
  return {
    ok: !!json.result?.uid,
    uid: json.result?.uid ?? null,
    error: json.error?.data?.name ?? json.error?.message ?? null,
  };
}

async function bffLogin(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Host: HOST },
    body: JSON.stringify({ login, password }),
  });
  const body = await res.json().catch(() => ({}));
  const jar = cookiesFrom(res);
  const tenant = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith('scc_tenant='))
    ?.split('=')[1]
    ?.split(';')[0];
  return {
    ok: body.success === true,
    status: res.status,
    jar,
    tenant,
    schoolId: body.data?.user?.active_school_id ?? body.data?.user?.schools?.[0]?.id,
    permissions: body.data?.user?.permissions ?? [],
    error: body.error?.code,
  };
}

async function bffGet(jar, path) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    headers: { Cookie: jar, Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success, data: body.data, error: body.error, meta: body.meta };
}

async function bffPost(jar, path, payload) {
  const res = await fetch(`${BASE}/api/odoo${path}`, {
    method: 'POST',
    headers: { Cookie: jar, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, success: body.success, data: body.data, error: body.error };
}

function resolveGuardianId(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.guardian?.id) return data.guardian.id;
  if (typeof data.id === 'number') return data.id;
  return null;
}

function isGuardianList(data) {
  if (Array.isArray(data)) return true;
  return Array.isArray(data?.items);
}

function guardianListCount(data) {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  return 0;
}

function schoolQuery(schoolId) {
  return schoolId ? `?active_school_id=${schoolId}` : '';
}

async function resolveStudentId(jar, schoolId, preferred) {
  if (preferred) {
    const probe = await bffGet(jar, `/admin/students/${preferred}${schoolQuery(schoolId)}`);
    if (probe.success && probe.data?.student?.id) return String(probe.data.student.id);
    if (probe.success && probe.data?.id) return String(probe.data.id);
  }
  const list = await bffGet(jar, `/admin/students?page=1&page_size=5${schoolId ? `&active_school_id=${schoolId}` : ''}`);
  const rows = Array.isArray(list.data) ? list.data : [];
  if (rows[0]?.id) return String(rows[0].id);
  return null;
}

const results = [];
let auth = null;
let studentId = null;
let qaGuardianId = null;
let qaRelationshipId = null;

function record(step, pass, extra = {}) {
  results.push({ step, pass, ...extra });
}

async function cleanup(jar, schoolId) {
  if (qaRelationshipId && studentId) {
    const end = await bffPost(
      jar,
      `/admin/students/${studentId}/guardians/${qaRelationshipId}/end${schoolQuery(schoolId)}`,
      { date_end: new Date().toISOString().slice(0, 10), notes: 'QA cleanup' },
    );
    record('cleanup_end_relationship', end.success, { error: end.error?.code });
  }
}

async function main() {
  console.log(`Student 360 Live QA — bff=${HOST} odoo=${loadOdooTarget().odooBaseUrl} db=school login=${LOGIN}`);

  if (process.env.ODOO_DB && process.env.ODOO_DB !== 'school' && !process.env.ODOO_DB_QA) {
    record('env_db_check', false, { note: 'ODOO_DB is not school; set ODOO_DB_QA=school' });
  } else {
    record('env_db_check', true);
  }

  let password;
  try {
    password = resolvePassword();
    record('password_resolved', true);
  } catch (e) {
    record('password_resolved', false, { error: 'missing_credentials' });
    console.log(JSON.stringify({ status: 'BLOCKED_BY_AUTHENTICATION', results }, null, 2));
    process.exit(1);
  }

  const direct = await odooAuthSchool(LOGIN, password);
  record('odoo_auth_school', direct.ok, { uid: direct.uid, error: direct.error });
  if (!direct.ok) {
    console.log(JSON.stringify({ status: 'BLOCKED_BY_BACKEND_AUTHENTICATION', results }, null, 2));
    process.exit(1);
  }

  auth = await bffLogin(LOGIN, password);
  record('bff_login', auth.ok, { tenant: auth.tenant, error: auth.error, status: auth.status });
  if (!auth.ok) {
    console.log(JSON.stringify({ status: 'BLOCKED_BY_BFF_AUTHENTICATION', results }, null, 2));
    process.exit(1);
  }

  if (auth.tenant && auth.tenant !== 'school') {
    record('tenant_check', false, { tenant: auth.tenant });
    console.log(JSON.stringify({ status: 'BLOCKED_WRONG_TENANT', results }, null, 2));
    process.exit(1);
  }
  record('tenant_check', true, { tenant: auth.tenant ?? 'school' });

  const me = await bffGet(auth.jar, '/me');
  record('me', me.success, {
    has_view_students: (me.data?.user?.permissions ?? auth.permissions).includes('view_students'),
    has_manage_students: (me.data?.user?.permissions ?? auth.permissions).includes('manage_students'),
    error: me.error?.code,
  });

  const preferred = process.env.STUDENT_360_QA_STUDENT_ID ?? '617';
  studentId = await resolveStudentId(auth.jar, auth.schoolId, preferred);
  record('resolve_student', !!studentId, { studentId });
  if (!studentId) {
    await cleanup(auth.jar, auth.schoolId);
    console.log(JSON.stringify({ status: 'CODE_COMPLETE_QA_BLOCKED', results }, null, 2));
    process.exit(1);
  }

  const sq = schoolQuery(auth.schoolId);
  const details = await bffGet(auth.jar, `/admin/students/${studentId}${sq}`);
  const nested = details.data?.student != null;
  record('student_details', details.success && nested, {
    has_capabilities: !!details.data?.capabilities,
    has_guardians: Array.isArray(details.data?.guardian_relationships),
    has_enrollment_field: details.data?.current_enrollment !== undefined,
    error: details.error?.code,
  });

  const list = await bffGet(
    auth.jar,
    `/admin/students?page=1&page_size=5${auth.schoolId ? `&active_school_id=${auth.schoolId}` : ''}`,
  );
  record('students_list', list.success && Array.isArray(list.data), { count: list.data?.length ?? 0 });

  const search = await bffGet(
    auth.jar,
    `/admin/guardians/search?q=qa&page=1&page_size=5&exclude_student_id=${studentId}${auth.schoolId ? `&active_school_id=${auth.schoolId}` : ''}`,
  );
  record('guardian_search', search.success && Array.isArray(search.data), {
    count: search.data?.length ?? 0,
    error: search.error?.code,
  });

  const guardians = await bffGet(auth.jar, `/admin/students/${studentId}/guardians${sq}`);
  record('guardian_list', guardians.success && isGuardianList(guardians.data), {
    count: guardianListCount(guardians.data),
    error: guardians.error?.code,
  });

  const enrollment = await bffGet(auth.jar, `/admin/students/${studentId}/enrollment${sq}`);
  record('enrollment_current', enrollment.success || enrollment.error?.code === 'not_found', {
    status: enrollment.success ? 'ok' : enrollment.error?.code,
  });

  const history = await bffGet(auth.jar, `/admin/students/${studentId}/enrollments${sq}`);
  record('enrollment_history', history.success && Array.isArray(history.data), {
    error: history.error?.code,
  });

  const qaPhone = `06${String(ts).slice(-8)}`;
  const qaName = `${QA_PREFIX} ${ts}`;
  const create = await bffPost(auth.jar, `/admin/guardians/quick-create${sq}`, {
    name: qaName,
    phone: qaPhone,
    email: `ssc360qa+${ts}@example.invalid`,
  });
  record('guardian_quick_create', create.success && !!resolveGuardianId(create.data), {
    status: create.status,
    error: create.error?.code,
  });

  if (!create.success && create.error?.code === 'guardian_duplicate') {
    const matches = create.error?.details?.matches;
    record('guardian_duplicate', Array.isArray(matches), { matchCount: matches?.length ?? 0 });
    if (matches?.[0]?.id) qaGuardianId = matches[0].id;
  } else if (create.success) {
    qaGuardianId = resolveGuardianId(create.data);
  }

  if (qaGuardianId) {
    const dupCreate = await bffPost(auth.jar, `/admin/guardians/quick-create${sq}`, {
      name: qaName,
      phone: qaPhone,
    });
    record('guardian_duplicate_409', dupCreate.status === 409 || dupCreate.error?.code === 'guardian_duplicate', {
      error: dupCreate.error?.code,
    });

    const link = await bffPost(auth.jar, `/admin/students/${studentId}/guardians${sq}`, {
      guardian_id: qaGuardianId,
      relationship_type: 'other',
      is_primary_contact: false,
      is_legal_guardian: false,
      is_financial_responsible: false,
      receives_notifications: true,
      is_emergency_contact: true,
      is_authorized_pickup: false,
      contact_priority: 99,
      notes: 'SSC360 QA link',
    });
    record('guardian_link', link.success, { error: link.error?.code });
    if (link.success && link.data?.relationship_id) {
      qaRelationshipId = link.data.relationship_id;
    } else if (link.error?.code === 'guardian_already_linked') {
      const rels = await bffGet(auth.jar, `/admin/students/${studentId}/guardians${sq}`);
      const existing = (rels.data ?? []).find((r) => r.guardian?.id === qaGuardianId);
      if (existing) qaRelationshipId = existing.relationship_id;
      record('guardian_already_linked', true);
    }

    if (qaRelationshipId) {
      const update = await bffPost(
        auth.jar,
        `/admin/students/${studentId}/guardians/${qaRelationshipId}/update${sq}`,
        { notes: 'SSC360 QA updated', contact_priority: 98 },
      );
      record('guardian_update', update.success, { error: update.error?.code });
    }
  }

  await cleanup(auth.jar, auth.schoolId);

  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'COMPLETED_LIVE_QA_PASSED' : 'CODE_COMPLETE_QA_BLOCKED',
        qa_database: 'school',
        alwah_used: false,
        host: HOST,
        studentId,
        results,
      },
      null,
      2,
    ),
  );
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  if (auth?.jar) await cleanup(auth.jar, auth.schoolId).catch(() => {});
  console.error(e.message);
  process.exit(1);
});
