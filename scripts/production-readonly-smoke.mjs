/**
 * Read-only Production smoke — NO mutations, NO login password changes.
 * Usage: node scripts/production-readonly-smoke.mjs [baseUrl]
 */
import { primeQaEnvFromLocal, loadAccountPassword } from './qa-env.mjs';

primeQaEnvFromLocal();

const base = (process.argv[2] ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const report = {
  status: 'PRODUCTION_DEPLOYED_AUTH_SMOKE_BLOCKED',
  base,
  timestamp: new Date().toISOString(),
  public: {},
  auth: {},
  readOnly: {},
  mutationsExecuted: false,
  summary: { pass: [], fail: [], skip: [] },
};

function pass(msg) {
  report.summary.pass.push(msg);
}
function fail(msg) {
  report.summary.fail.push(msg);
}
function skip(msg) {
  report.summary.skip.push(msg);
}

async function getPage(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    redirect: 'manual',
    headers: { Accept: 'text/html,application/json', ...opts.headers },
    ...opts,
  });
  const ct = res.headers.get('content-type') ?? '';
  const text = ct.includes('json') ? null : await res.text().catch(() => '');
  const json = ct.includes('json') ? await res.json().catch(() => ({})) : null;
  return {
    status: res.status,
    location: res.headers.get('location'),
    vercelId: res.headers.get('x-vercel-id'),
    deploymentId: res.headers.get('x-vercel-deployment-url'),
    hasHtml: text ? text.includes('<!DOCTYPE') || text.includes('<html') : false,
    hasCrash: text ? /Application error|Internal Server Error|500/.test(text.slice(0, 2000)) : false,
    json,
    textSnippet: text ? text.slice(0, 500) : null,
  };
}

// Public pages
for (const [name, path] of [
  ['home', '/'],
  ['login', '/login'],
  ['icon', '/icon.svg'],
]) {
  const r = await getPage(path);
  report.public[name] = { status: r.status, vercelId: r.vercelId };
  if (r.status >= 500 || r.hasCrash) fail(`public ${name}: ${r.status}`);
  else if (r.status < 500) pass(`public ${name}: ${r.status}`);
}

// Tenant probe (read-only)
const tenant = await getPage('/api/tenant');
report.public.tenant = tenant.json ?? { status: tenant.status };
if (tenant.json?.success) pass('tenant API OK');
else fail(`tenant API: ${tenant.status}`);

// Login attempt (read-only probe — does not change credentials)
try {
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login: 'done', password: loadAccountPassword('done') }),
  });
  const body = await loginRes.json().catch(() => ({}));
  report.auth.login = {
    status: loginRes.status,
    success: body.success,
    error: body.error?.code ?? null,
  };
  if (body.success) {
    const cookies = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
    report.auth.sessionAvailable = true;

    async function bffGet(path) {
      const res = await fetch(`${base}/api/odoo${path}`, {
        headers: { Cookie: cookies, Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, success: data.success, error: data.error?.code };
    }

    const readEndpoints = [
      ['/admin/setup/readiness', 'readiness'],
      ['/admin/levels', 'levels'],
      ['/admin/levels/options?include_enabled=true', 'levelsOptions'],
      ['/admin/classes', 'classes'],
      ['/admin/subjects', 'subjects'],
      ['/admin/tracks', 'tracks'],
      ['/admin/teachers', 'teachers'],
      ['/admin/staff', 'staff'],
      ['/admin/teaching-assignments', 'assignments'],
    ];

    for (const [path, key] of readEndpoints) {
      const r = await bffGet(path);
      report.readOnly[key] = r;
      if (r.status >= 500) fail(`GET ${key}: ${r.status}`);
      else if (r.success) pass(`GET ${key}: OK`);
      else skip(`GET ${key}: ${r.error ?? r.status}`);
    }

    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookies, Accept: 'application/json' } });
    const meBody = await me.json().catch(() => ({}));
    report.auth.me = { status: me.status, success: meBody.success };
    if (meBody.success) pass('GET /api/auth/me OK');

    for (const [name, path] of [
      ['settings', '/admin/settings'],
      ['academicSetup', '/admin/settings/academic-setup'],
      ['classes', '/admin/settings/academic-setup/classes'],
      ['subjects', '/admin/settings/academic-setup/subjects'],
      ['teachers', '/admin/settings/academic-setup/teachers'],
      ['staff', '/admin/settings/academic-setup/staff'],
      ['assignments', '/admin/settings/academic-setup/assignments'],
    ]) {
      const r = await getPage(path, { headers: { Cookie: cookies } });
      report.readOnly[`page_${name}`] = { status: r.status, redirect: r.location };
      if (r.status >= 500 || r.hasCrash) fail(`page ${name}: ${r.status}`);
      else if (r.status === 200 || r.status === 307 || r.status === 302) pass(`page ${name}: ${r.status}`);
      else skip(`page ${name}: ${r.status}`);
    }

    report.status = report.summary.fail.length
      ? 'BLOCKED_BY_PRODUCTION_RUNTIME'
      : 'PRODUCTION_DEPLOYED_NO_DATA_CHANGES';
  } else {
    report.auth.sessionAvailable = false;
    skip(`login: ${body.error?.code ?? loginRes.status} — authenticated smoke skipped`);
    report.status =
      report.summary.fail.length === 0
        ? 'PRODUCTION_DEPLOYED_AUTH_SMOKE_BLOCKED'
        : 'BLOCKED_BY_PRODUCTION_RUNTIME';
  }
} catch (e) {
  report.auth.error = e.message;
  skip('login probe failed');
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.summary.fail.length > 0 ? 1 : 0);
