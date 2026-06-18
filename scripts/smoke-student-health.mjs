/**
 * Local smoke: student 854 health tab contract (API + mapper).
 * Usage: node scripts/smoke-student-health.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const login = process.env.STUDENT_360_QA_LOGIN ?? 'done';
const password = process.env.STUDENT_360_QA_PASSWORD ?? 'admin123';

function loadEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const jar = new Map();

function getCookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    if (k) jar.set(k.trim(), v ?? '');
  }
}

async function api(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      cookie: getCookieHeader(),
      ...(init.headers ?? {}),
    },
  });
  storeCookies(res);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

import {
  hasCriticalHealthAlert,
  normalizeStudentHealthProfile,
  normalizeStudentHealthSummary,
} from '../src/features/admin/students/utils/normalize-student-health.ts';
import { buildStudent360TabIndicators } from '../src/features/admin/students/utils/student-360-tab-indicators.ts';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

function tabIndicators(summary) {
  return buildStudent360TabIndicators(
    {
      health_summary: summary,
      document_summary: null,
      finance_summary: null,
      capabilities: { can_view_health: true },
      guardian_relationships: [],
      current_enrollment: null,
      student: { id: 854 },
    },
    { showFinance: false, showHealth: true, showDocuments: false },
  );
}

function assertNoCritical(label, profile, summary) {
  const critical = hasCriticalHealthAlert(profile) || hasCriticalHealthAlert(summary);
  const healthIndicator = tabIndicators(summary).health;
  if (critical) fail(label, 'critical alert true');
  else pass(label, 'no critical alert');
  if (healthIndicator?.tone === 'red') fail(`${label} tab badge`, 'red badge present');
  else pass(`${label} tab badge`, 'no red badge');
}

function assertCritical(label, profile, summary) {
  const critical = hasCriticalHealthAlert(profile) || hasCriticalHealthAlert(summary);
  const healthIndicator = tabIndicators(summary).health;
  if (!critical) fail(label, 'expected critical alert');
  else pass(label, 'critical alert shown');
  if (healthIndicator?.tone !== 'red') fail(`${label} tab badge`, 'expected red badge');
  else pass(`${label} tab badge`, 'red badge present');
}

const loginRes = await api('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ login, password }),
});
if (!loginRes.res.ok) {
  console.error('Login failed', loginRes.body);
  process.exit(1);
}
pass('login', String(loginRes.res.status));

const pageRes = await fetch(`${base}/admin/students/854?tab=health`, {
  headers: { cookie: getCookieHeader() },
});
if (pageRes.ok) pass('health page HTTP', String(pageRes.status));
else fail('health page HTTP', String(pageRes.status));

const healthRes = await api('/api/odoo/admin/students/854/health');
const raw = healthRes.body?.data ?? healthRes.body;
const profile = normalizeStudentHealthProfile(raw?.profile ?? raw);
const summary = normalizeStudentHealthSummary({
  has_profile: profile != null,
  has_critical_health_alert: profile?.has_critical_health_alert,
  health_alert_level: profile?.health_alert_level,
  has_critical_alert: profile?.has_critical_alert,
});

console.log('\nCurrent profile flags:', {
  has_allergies: profile?.has_allergies,
  has_chronic_conditions: profile?.has_chronic_conditions,
  health_alert_level: profile?.health_alert_level,
  has_critical_health_alert: profile?.has_critical_health_alert,
});

// Scenario 1: both false => no critical
const scenario1Profile = normalizeStudentHealthProfile({
  ...profile,
  has_allergies: false,
  allergies_description: null,
  has_chronic_conditions: false,
  chronic_conditions_description: null,
  has_critical_health_alert: false,
  health_alert_level: 'none',
  critical_health_items: [],
});
const scenario1Summary = normalizeStudentHealthSummary({
  has_profile: true,
  has_critical_health_alert: false,
  health_alert_level: 'none',
});
console.log('\n— Scenario 1 (allergies=no, chronic=no) —');
assertNoCritical('scenario 1 alert', scenario1Profile, scenario1Summary);

// Scenario 2: allergies yes + description => critical
const scenario2Profile = normalizeStudentHealthProfile({
  ...profile,
  has_allergies: true,
  allergies_description: 'فول سوداني',
  has_critical_health_alert: true,
  health_alert_level: 'critical',
  critical_health_items: [{ key: 'allergies', label: 'الحساسية', description: 'فول سوداني' }],
});
const scenario2Summary = normalizeStudentHealthSummary({
  has_profile: true,
  has_critical_health_alert: true,
  health_alert_level: 'critical',
});
console.log('\n— Scenario 2 (allergies=yes + description) —');
assertCritical('scenario 2 alert', scenario2Profile, scenario2Summary);

// Scenario 3: back to no after refetch simulation
const scenario3Profile = normalizeStudentHealthProfile({
  ...scenario2Profile,
  has_allergies: false,
  allergies_description: null,
  has_critical_health_alert: false,
  health_alert_level: 'none',
  critical_health_items: [],
});
const scenario3Summary = normalizeStudentHealthSummary({
  has_profile: true,
  has_critical_health_alert: false,
  health_alert_level: 'none',
});
console.log('\n— Scenario 3 (allergies=no after save/refetch) —');
assertNoCritical('scenario 3 alert', scenario3Profile, scenario3Summary);

// Live data note
console.log('\n— Live student 854 —');
if (profile?.has_allergies === false && profile?.has_chronic_conditions === false) {
  assertNoCritical('live data', profile, summary);
} else if (profile?.has_allergies === true && profile?.allergies_description) {
  assertCritical('live data', profile, summary);
} else {
  pass('live data', 'skipped strict assert (mixed/legacy state)');
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
