/**
 * Live QA for Host → Tenant → Database auth (not committed).
 * Usage: node scripts/tenant-auth-live-qa.mjs
 */
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

primeQaEnvFromLocal();

const DOMAINS = [
  { host: 'school.raqeem.ma', tenant: 'school', login: 'admin' },
  { host: 'nibras.raqeem.ma', tenant: 'nibras', login: 'admin' },
  { host: 'alwah.raqeem.ma', tenant: 'alwah', login: 'admin' },
];

function baseUrl(host) {
  return `https://${host}`;
}

function cookiesFrom(res, prev = '') {
  const parts = prev ? prev.split('; ').filter(Boolean) : [];
  for (const c of res.headers.getSetCookie?.() ?? []) parts.push(c.split(';')[0]);
  return [...new Set(parts)].join('; ');
}

function parseSetCookies(res) {
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]);
}

async function loginOn(host, login, extraBody = {}) {
  const url = `${baseUrl(host)}/api/auth/login`;
  let password;
  try {
    password = loadAccountPassword(login);
  } catch {
    password = process.env.ODOO_QA_ADMIN_PASSWORD ?? process.env.QA_PASSWORD;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Host: host },
    body: JSON.stringify({ login, password, ...extraBody }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  const setCookies = parseSetCookies(res);
  const hasTenant = setCookies.some((c) => c.startsWith('scc_tenant='));
  const tenantValue = setCookies.find((c) => c.startsWith('scc_tenant='))?.split('=')[1];
  const hasSession = setCookies.some((c) => c.startsWith('scc_session='));
  const bodyStr = JSON.stringify(body);
  const leaksDb =
    /\b(alwah|nibras|school)\b/.test(bodyStr) &&
    bodyStr.includes('"db"');
  return {
    host,
    status: res.status,
    success: body.success === true,
    errorCode: body.error?.code,
    hasTenant,
    tenantValue,
    hasSession,
    leaksDb,
    jar: cookiesFrom(res),
    bodyPreview: body.success
      ? { role: body.data?.user?.role, login: body.data?.user?.login }
      : { code: body.error?.code, message: body.error?.message },
  };
}

async function meOn(host, jar) {
  const res = await fetch(`${baseUrl(host)}/api/odoo/me`, {
    headers: { Cookie: jar, Host: host },
  });
  const body = await res.json().catch(() => ({}));
  const cleared = parseSetCookies(res).some((c) => c.startsWith('scc_session=') && c.includes('Max-Age=0'));
  return { host, status: res.status, success: body.success, cleared };
}

async function protectedPage(host, jar) {
  const res = await fetch(`${baseUrl(host)}/admin/dashboard`, {
    headers: { Cookie: jar, Host: host },
    redirect: 'manual',
  });
  return { host, status: res.status, location: res.headers.get('location') };
}

async function logoutOn(host, jar) {
  const res = await fetch(`${baseUrl(host)}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: jar, Host: host },
  });
  const cleared = parseSetCookies(res).filter((c) =>
    ['scc_session', 'scc_tenant', 'scc_active_school'].some((n) => c.startsWith(`${n}=`)),
  );
  return { host, status: res.status, clearedCount: cleared.length, body: await res.json().catch(() => ({})) };
}

async function crossTenant(schoolJar, wrongHost) {
  return meOn(wrongHost, schoolJar);
}

const report = { domains: [], crossTenant: [], invalidHost: null, bodyDbIgnored: null };

console.log('=== Tenant auth live QA ===\n');

report.invalidHost = await loginOn('raqeem.ma', 'admin');
console.log('invalid host raqeem.ma:', report.invalidHost.status, report.invalidHost.errorCode);

report.bodyDbIgnored = await loginOn('school.raqeem.ma', 'admin', { db: 'nibras' });
console.log('body db ignored (school host + db=nibras):', report.bodyDbIgnored);

for (const d of DOMAINS) {
  console.log(`\n--- ${d.host} (expected tenant: ${d.tenant}) ---`);
  const login = await loginOn(d.host, d.login);
  console.log('login:', login);
  report.domains.push({ ...d, login });

  if (!login.jar) continue;

  const me = await meOn(d.host, login.jar);
  console.log('me:', me);
  const page = await protectedPage(d.host, login.jar);
  console.log('protected page:', page);
  const out = await logoutOn(d.host, login.jar);
  console.log('logout:', out);

  Object.assign(report.domains[report.domains.length - 1], { me, page, logout: out });
}

// Cross-tenant: login school, hit nibras
const schoolLogin = await loginOn('school.raqeem.ma', 'admin');
if (schoolLogin.jar) {
  for (const wrong of ['nibras.raqeem.ma', 'alwah.raqeem.ma']) {
    const ct = await crossTenant(schoolLogin.jar, wrong);
    console.log(`\ncross-tenant school → ${wrong}:`, ct);
    report.crossTenant.push({ from: 'school', to: wrong, ...ct });
  }
}

const alwahLogin = await loginOn('alwah.raqeem.ma', 'admin');
if (alwahLogin.jar) {
  const ct = await crossTenant(alwahLogin.jar, 'school.raqeem.ma');
  console.log('\ncross-tenant alwah → school:', ct);
  report.crossTenant.push({ from: 'alwah', to: 'school.raqeem.ma', ...ct });
}

console.log('\n=== SUMMARY JSON ===');
console.log(JSON.stringify(report, null, 2));
