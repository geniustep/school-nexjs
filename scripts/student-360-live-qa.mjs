/**
 * Live QA — Student 360 API on database school (read-only probes + optional write with QA_ prefix).
 * Usage: node scripts/student-360-live-qa.mjs
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const HOST = process.env.STUDENT_360_QA_HOST ?? 'school.raqeem.ma';
const BASE = `https://${HOST}`;
const STUDENT_ID = process.env.STUDENT_360_QA_STUDENT_ID ?? '617';
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'qa.schoolmgr';

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

async function login() {
  const password = loadAccountPassword(LOGIN);
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Host: HOST },
    body: JSON.stringify({ login: LOGIN, password }),
  });
  const body = await res.json().catch(() => ({}));
  const jar = cookiesFrom(res);
  const tenant = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith('scc_tenant='))
    ?.split('=')[1]
    ?.split(';')[0];
  return {
    ok: body.success === true,
    jar,
    tenant,
    schoolId: body.data?.user?.active_school_id ?? body.data?.user?.schools?.[0]?.id,
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

const results = [];

async function main() {
  console.log(`Student 360 Live QA — host=${HOST} db expectation=school studentId=${STUDENT_ID}`);

  const auth = await login();
  results.push({ step: 'login', pass: auth.ok, tenant: auth.tenant, error: auth.error });
  if (!auth.ok) {
    console.log(JSON.stringify({ status: 'CODE_COMPLETE_QA_BLOCKED', results }, null, 2));
    process.exit(1);
  }

  if (auth.tenant && auth.tenant !== 'school') {
    results.push({ step: 'tenant_check', pass: false, tenant: auth.tenant });
    console.log(JSON.stringify({ status: 'BLOCKED_WRONG_TENANT', results }, null, 2));
    process.exit(1);
  }

  const schoolQ = auth.schoolId ? `?active_school_id=${auth.schoolId}` : '';
  const details = await bffGet(jar, `/admin/students/${STUDENT_ID}${schoolQ}`);
  const nested = details.data?.student != null;
  results.push({
    step: 'student_details',
    pass: details.success && nested,
    has_capabilities: !!details.data?.capabilities,
    has_guardians: Array.isArray(details.data?.guardian_relationships),
    has_enrollment: details.data?.current_enrollment !== undefined,
    error: details.error?.code,
  });

  const search = await bffGet(
    auth.jar,
    `/admin/guardians/search?q=qa&page=1&page_size=5${auth.schoolId ? `&active_school_id=${auth.schoolId}` : ''}&exclude_student_id=${STUDENT_ID}`,
  );
  results.push({
    step: 'guardian_search',
    pass: search.success && Array.isArray(search.data),
    count: Array.isArray(search.data) ? search.data.length : 0,
    error: search.error?.code,
  });

  const guardians = await bffGet(auth.jar, `/admin/students/${STUDENT_ID}/guardians${schoolQ}`);
  results.push({
    step: 'guardian_list',
    pass: guardians.success && Array.isArray(guardians.data),
    error: guardians.error?.code,
  });

  const enrollment = await bffGet(auth.jar, `/admin/students/${STUDENT_ID}/enrollment${schoolQ}`);
  results.push({
    step: 'enrollment_current',
    pass: enrollment.success || enrollment.error?.code === 'not_found',
    status: enrollment.success ? 'ok' : enrollment.error?.code,
  });

  const history = await bffGet(auth.jar, `/admin/students/${STUDENT_ID}/enrollments${schoolQ}`);
  results.push({
    step: 'enrollment_history',
    pass: history.success && Array.isArray(history.data),
    error: history.error?.code,
  });

  const allPass = results.every((r) => r.pass);
  console.log(
    JSON.stringify(
      {
        status: allPass ? 'COMPLETED_LIVE_QA_PASSED' : 'CODE_COMPLETE_QA_BLOCKED',
        qa_database: 'school',
        alwah_used: false,
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
