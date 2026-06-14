/**
 * Student import template + validation live QA (school database only).
 * Usage: node scripts/student-import-live-qa.mjs [baseUrl]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const optionsBase = (process.argv[3] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';

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

async function bffGet(origin, jar, path) {
  const res = await fetch(`${origin}/api/odoo${path}`, {
    headers: { Cookie: jar, Accept: 'application/json' },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function fetchImportPage(jar) {
  const res = await fetch(`${base}/admin/students/import`, {
    headers: { Cookie: jar },
    redirect: 'manual',
  });
  const html = res.status === 200 ? await res.text() : '';
  return {
    status: res.status,
    hasShell: html.includes('student-import-page'),
    hasStyles: html.includes('student-import'),
  };
}

const report = {
  base,
  optionsBase,
  database: process.env.ODOO_DB,
  login: LOGIN,
  checks: [],
  passed: true,
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

try {
  const password = process.env.STUDENT_360_QA_PASSWORD?.trim() || loadAccountPassword(LOGIN);
  const pageAuth = await bffLogin(base, LOGIN, password);
  check('login_page_origin', pageAuth.ok, base);
  if (!pageAuth.ok) throw new Error('login_failed');

  const optionsAuth = await bffLogin(optionsBase, LOGIN, password);
  check('login_options_origin', optionsAuth.ok, optionsBase);
  if (!optionsAuth.ok) throw new Error('options_login_failed');

  const sq = optionsAuth.schoolId ? `?active_school_id=${optionsAuth.schoolId}` : '';
  const options = await bffGet(optionsBase, optionsAuth.jar, `/admin/students/options${sq}`);
  const data = options.body.data ?? {};
  check('students_options', options.body.success === true, Object.keys(data).join(', '));
  check('options_gender', Array.isArray(data.gender) && data.gender.length > 0);
  check('options_classes', Array.isArray(data.classes) && data.classes.length > 0);
  check('options_registration_types', Array.isArray(data.registration_types) && data.registration_types.length > 0);

  const unit = spawnSync('npm run test -- src/features/admin/students/import/student-import.test.ts', {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });
  check('unit_tests', unit.status === 0, unit.status === 0 ? 'passed' : unit.stderr?.slice(0, 400));

  const page = await fetchImportPage(pageAuth.jar);
  check('import_page_status', page.status === 200, String(page.status));
  check('import_page_shell', page.hasShell && page.hasStyles, page);
} catch (error) {
  check('runtime', false, error instanceof Error ? error.message : String(error));
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
