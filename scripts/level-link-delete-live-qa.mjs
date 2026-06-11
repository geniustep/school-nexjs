/**
 * Level link/delete live QA via Next.js BFF — tenant DB `school` only.
 * Usage: ODOO_DB=school node scripts/level-link-delete-live-qa.mjs [baseUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const base = (process.argv[2] ?? process.env.QA_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const LOGIN = 'done';

const report = {
  status: 'PARTIALLY_COMPLETED',
  base,
  db: process.env.ODOO_DB,
  timestamp: new Date().toISOString(),
  link: {},
  delete: {},
  options: {},
  readiness: {},
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

function mergeCookies(prev, res) {
  const jar = new Map();
  for (const part of (prev ?? '').split('; ').filter(Boolean)) {
    const [k, ...v] = part.split('=');
    jar.set(k, v.join('='));
  }
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const [k, ...v] = pair.split('=');
    jar.set(k.trim(), v.join('='));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function bffFetch(cookies, apiPath, { method = 'GET', query = {}, body = null } = {}) {
  const sp = new URLSearchParams(query);
  const url = `${base}/api/odoo${apiPath}${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      Cookie: cookies,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') ?? '';
  const isJson = ct.includes('json');
  const parsed = isJson ? await res.json().catch(() => ({})) : { raw: (await res.text()).slice(0, 200) };
  return {
    status: res.status,
    isJson,
    success: parsed.success,
    error: parsed.error ?? null,
    data: parsed.data ?? null,
  };
}

async function login() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login: LOGIN, password: loadAccountPassword(LOGIN) }),
  });
  const body = await res.json().catch(() => ({}));
  const cookies = mergeCookies('', res);
  return {
    ok: body.success === true,
    cookies,
    activeSchoolId: body.data?.user?.active_school_id ?? null,
    permissions: body.data?.user?.permissions ?? [],
  };
}

const auth = await login();
if (!auth.ok) {
  report.status = 'BLOCKED_BY_AUTH';
  fail('login failed');
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const q = auth.activeSchoolId ? { active_school_id: String(auth.activeSchoolId) } : {};

const optionsRes = await bffFetch(auth.cookies, '/admin/levels/options', {
  query: { ...q, include_enabled: 'true' },
});
report.options = { status: optionsRes.status, success: optionsRes.success };

if (!optionsRes.success) {
  report.status = 'BLOCKED_BY_BACKEND_DEPLOYMENT';
  fail(`levels/options failed: ${optionsRes.error?.code ?? optionsRes.status}`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const refs = optionsRes.data?.reference_levels ?? [];
const p1 = refs.find((r) => r.code === 'P1' || r.id === 4);

if (p1) {
  report.link.p1 = {
    id: p1.id,
    link_status: p1.link_status,
    can_link: p1.can_link,
    school_level_id: p1.school_level_id,
    enabled: p1.enabled,
  };
  if (p1.link_status === 'enabled' && p1.can_link === false) pass('P1 shows enabled with can_link=false');
  else fail(`P1 unexpected state: link_status=${p1.link_status} can_link=${p1.can_link}`);

  const linkRes = await bffFetch(auth.cookies, `/admin/levels/${p1.school_level_id ?? 77}/link-reference`, {
    method: 'POST',
    query: q,
    body: { reference_level_id: p1.id },
  });
  report.link.alreadyLinkedProbe = {
    status: linkRes.status,
    action: linkRes.data?.action ?? null,
    error: linkRes.error?.code ?? null,
  };
  if (linkRes.success && linkRes.data?.action === 'already_linked') pass('link-reference returns already_linked for P1');
  else if (linkRes.data?.action === 'already_linked') pass('link-reference returns already_linked for P1');
  else fail(`link-reference P1: expected already_linked, got ${linkRes.data?.action ?? linkRes.error?.code}`);

  const deleteP1 = await bffFetch(auth.cookies, `/admin/levels/${p1.school_level_id ?? 77}`, {
    method: 'DELETE',
    query: q,
  });
  report.delete.p1Blocked = {
    status: deleteP1.status,
    error: deleteP1.error?.code ?? null,
    details: deleteP1.error?.details ?? null,
  };
  if (deleteP1.status === 409 && deleteP1.error?.code === 'level_in_use') {
    pass('DELETE P1 blocked with level_in_use');
    if (deleteP1.error?.details?.classes >= 1) pass('level_in_use details include classes count');
    else fail('level_in_use details missing classes');
  } else {
    fail(`DELETE P1 expected 409 level_in_use, got ${deleteP1.status} ${deleteP1.error?.code}`);
  }
} else {
  skip('P1 not found in reference_levels');
}

const levelsList = await bffFetch(auth.cookies, '/admin/levels', { query: q });
const schoolLevels = levelsList.data?.levels ?? levelsList.data ?? [];
const inUseLevel = schoolLevels.find((l) => (l.classes_count ?? 0) > 0);
if (inUseLevel) {
  const delInUse = await bffFetch(auth.cookies, `/admin/levels/${inUseLevel.id}`, {
    method: 'DELETE',
    query: q,
  });
  report.delete.inUseLevel = {
    id: inUseLevel.id,
    status: delInUse.status,
    error: delInUse.error?.code ?? null,
    details: delInUse.error?.details ?? null,
  };
  if (delInUse.status === 409 && delInUse.error?.code === 'level_in_use') pass('DELETE in-use level returns 409');
  else fail(`DELETE in-use level expected 409, got ${delInUse.status}`);
}

const p1SchoolId = p1?.school_level_id ?? 77;
let qaLevelId = null;
const emptySchoolLevel = schoolLevels.find(
  (l) =>
    l.id !== p1SchoolId &&
    (l.classes_count ?? 0) === 0 &&
    (l.code?.startsWith('QA_') || l.code === 'H_TC'),
);
if (emptySchoolLevel) {
  qaLevelId = emptySchoolLevel.id;
  pass(`using empty school level ${emptySchoolLevel.code} id=${qaLevelId} for delete QA`);
} else {
  const enableCandidate = refs.find(
    (r) => r.link_status === 'not_enabled' && r.can_enable && r.active,
  );
  if (enableCandidate) {
    const enableRes = await bffFetch(auth.cookies, '/admin/levels/enable', {
      method: 'POST',
      query: q,
      body: { reference_level_ids: [enableCandidate.id] },
    });
    report.delete.enableForQa = {
      refId: enableCandidate.id,
      code: enableCandidate.code,
      status: enableRes.status,
      success: enableRes.success,
      error: enableRes.error?.code ?? null,
    };
    const refreshed = await bffFetch(auth.cookies, '/admin/levels', { query: q });
    const levels = refreshed.data?.levels ?? refreshed.data ?? [];
    const enabled = levels.find(
      (l) => l.ref_level_id === enableCandidate.id || l.code === enableCandidate.code,
    );
    if (enabled && (enabled.classes_count ?? 0) === 0) {
      qaLevelId = enabled.id;
      pass(`enabled empty level ${enableCandidate.code} id=${qaLevelId} for delete QA`);
    } else {
      skip('could not obtain empty school level for delete QA');
    }
  } else {
    skip('no enable candidate for delete QA');
  }
}

if (qaLevelId) {
  const delEmpty = await bffFetch(auth.cookies, `/admin/levels/${qaLevelId}`, {
    method: 'DELETE',
    query: q,
  });
  report.delete.emptyLevel = {
    id: qaLevelId,
    status: delEmpty.status,
    action: delEmpty.data?.action ?? null,
    error: delEmpty.error?.code ?? null,
  };
  if (delEmpty.success && (delEmpty.data?.action === 'deleted' || delEmpty.data?.action === 'deactivated')) {
    pass(`DELETE empty level returned ${delEmpty.data.action}`);
    const optsAfter = await bffFetch(auth.cookies, '/admin/levels/options', {
      query: { ...q, include_enabled: 'true' },
    });
    const refAfter = (optsAfter.data?.reference_levels ?? []).find((r) => r.school_level_id === qaLevelId);
    if (!refAfter || refAfter.link_status === 'not_enabled') pass('options refreshed after delete');
    else fail('reference still shows linked after delete');
  } else {
    fail(`DELETE empty level failed: ${delEmpty.error?.code ?? delEmpty.status}`);
  }
}

const readiness = await bffFetch(auth.cookies, '/admin/setup/readiness', { query: q });
report.readiness = { status: readiness.status, success: readiness.success };
if (readiness.success) pass('readiness OK after mutations');
else fail('readiness failed');

const i18nFiles = ['ar', 'fr', 'en', 'es'];
const requiredKeys = [
  'completeLinkAction',
  'linkLevelTitle',
  'linkLevelAlreadyLinked',
  'legacyAmbiguousHelp',
  'removeLevelTitle',
  'levelInUseBlocked',
];
for (const locale of i18nFiles) {
  const raw = fs.readFileSync(path.join(ROOT, 'messages', `${locale}.json`), 'utf8');
  const missing = requiredKeys.filter((k) => !raw.includes(`"${k}"`));
  if (missing.length === 0) pass(`i18n ${locale} keys present`);
  else fail(`i18n ${locale} missing: ${missing.join(', ')}`);
}

const levelUiKeys = [
  'statusLegacyUnlinked',
  'completeLinkAction',
  'linkLevelTitle',
  'linkLevelConfirm',
  'linkLevelSuccess',
  'linkLevelAlreadyLinked',
  'legacyAmbiguousHelp',
  'removeLevelAction',
  'removeLevelTitle',
  'levelInUseBlocked',
  'levelsApiBlockedDesc',
];
for (const locale of i18nFiles) {
  const raw = fs.readFileSync(path.join(ROOT, 'messages', `${locale}.json`), 'utf8');
  const values = levelUiKeys
    .map((k) => {
      const m = raw.match(new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`));
      return m?.[1] ?? '';
    })
    .join(' ');
  if (/Odoo|Backend|Database|ref_level_id|duplicate_record|ORM/.test(values)) {
    fail(`i18n ${locale} level UI strings contain forbidden terms`);
  } else {
    pass(`i18n ${locale} level UI strings clean`);
  }
}

if (report.summary.fail.length === 0) report.status = 'COMPLETED';
else if (report.summary.pass.length > 0) report.status = 'PARTIALLY_COMPLETED';

const outPath = path.join(ROOT, 'NEXTJS-ACADEMIC-LEVEL-LINK-DELETE-LIVE-QA_REPORT.md');
const md = `# NEXTJS Academic Level Link/Delete — Live QA

**Status:** ${report.status}
**Base:** ${report.base}
**DB:** ${report.db}
**Date:** ${report.timestamp}

## Pass (${report.summary.pass.length})
${report.summary.pass.map((p) => `- ${p}`).join('\n')}

## Fail (${report.summary.fail.length})
${report.summary.fail.map((f) => `- ${f}`).join('\n') || '- none'}

## Skip (${report.summary.skip.length})
${report.summary.skip.map((s) => `- ${s}`).join('\n') || '- none'}

## API snapshots
\`\`\`json
${JSON.stringify({ link: report.link, delete: report.delete, readiness: report.readiness }, null, 2)}
\`\`\`
`;
fs.writeFileSync(outPath, md, 'utf8');

console.log(JSON.stringify(report, null, 2));
console.log(`\nReport: ${outPath}`);
process.exit(report.summary.fail.length > 0 ? 1 : 0);
