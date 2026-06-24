/**
 * Admission reimport upsert — dry-run, sample, or full execute.
 *
 * Usage:
 *   node scripts/admission-reimport-upsert.mjs --dry-run --file=path/to/file.csv
 *   node scripts/admission-reimport-upsert.mjs --execute --sample=8 --file=path
 *   node scripts/admission-reimport-upsert.mjs --execute --file=path
 *   node scripts/admission-reimport-upsert.mjs --lookup-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadAccountPassword, primeQaEnvFromLocal } from './qa-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
primeQaEnvFromLocal();
process.env.ODOO_DB = process.env.ODOO_DB_QA ?? 'school';

const base = (process.env.ADMISSION_REIMPORT_BASE ?? 'https://school.raqeem.ma').replace(/\/$/, '');
const LOGIN = process.env.STUDENT_360_QA_LOGIN ?? 'done';

function parseArgs(argv) {
  const out = {
    dryRun: false,
    execute: false,
    sample: 0,
    file: '',
    allowCreate: false,
    lookupOnly: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--execute') out.execute = true;
    else if (arg === '--lookup-only') out.lookupOnly = true;
    else if (arg.startsWith('--sample=')) out.sample = Number(arg.slice('--sample='.length)) || 0;
    else if (arg.startsWith('--file=')) out.file = arg.slice('--file='.length);
    else if (arg === '--allow-create') out.allowCreate = true;
  }
  if (!out.dryRun && !out.execute && !out.lookupOnly) out.dryRun = true;
  if (!out.file) {
    out.file =
      process.env.ADMISSION_REIMPORT_FILE ??
      path.join(ROOT, 'data', 'raqeem_admissions_reimport_smart_siblings_2026_2027.csv');
  }
  return out;
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

async function bff(pathname, jar, init = {}) {
  const res = await fetch(`${base}/api/odoo${pathname}`, {
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

async function fetchAdmissionLookupIndex(jar, schoolId, listItems) {
  const fromList = listItems
    .map((a) => {
      const external_reference = normalizeExternalReference(a.external_reference);
      if (!external_reference) return null;
      return { id: a.id, external_reference, reference: a.reference ?? null };
    })
    .filter(Boolean);

  if (fromList.length > 0) {
    return { existing: fromList, source: 'list', detail_fetches: 0 };
  }

  const sq = schoolId ? `?active_school_id=${schoolId}` : '';
  const fromDetail = [];
  for (const item of listItems) {
    const detail = await bff(`/admin/admissions/${item.id}${sq}`, jar);
    const external_reference = normalizeExternalReference(detail.body.data?.external_reference);
    if (external_reference) {
      fromDetail.push({
        id: item.id,
        external_reference,
        reference: detail.body.data?.reference ?? item.reference ?? null,
      });
    }
  }
  return { existing: fromDetail, source: 'detail', detail_fetches: listItems.length };
}

function normalizeExternalReference(value) {
  if (value === false || value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

async function fetchAllAdmissions(jar, schoolId) {
  const sq = schoolId ? `&active_school_id=${schoolId}` : '';
  const all = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    const res = await bff(`/admin/admissions?page=${page}&page_size=200${sq}`, jar);
    if (!res.body.success) break;
    const items = Array.isArray(res.body.data) ? res.body.data : [];
    const meta = res.body.meta ?? {};
    total = meta.pagination?.total ?? meta.total ?? items.length;
    all.push(...items);
    if (!items.length || all.length >= total) break;
    page += 1;
  }
  return all;
}

function omitEmptyPayloadFields(payload) {
  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

function mergeNonDestructivePatch(existing, filePayload) {
  const patch = omitEmptyPayloadFields(filePayload);
  const out = { ...patch };
  for (const key of Object.keys(patch)) {
    const incoming = patch[key];
    const current = existing[key];
    if (typeof incoming === 'string' && !incoming.trim() && current != null && String(current).trim()) {
      delete out[key];
    }
  }
  return out;
}

function runPlan(file, existing, sample, allowCreate) {
  const configPath = path.join(ROOT, '.diag-output', 'admission-reimport-config.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify({ file, existing, sample, allowCreate }),
  );
  process.env.ADMISSION_REIMPORT_CONFIG = configPath;
  const proc = spawnSync(
    'node',
    ['--experimental-strip-types', path.join(ROOT, 'scripts', 'admission-reimport-plan-runner.mts')],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env } },
  );
  if (proc.status !== 0) {
    throw new Error(proc.stderr?.slice(0, 800) || proc.stdout?.slice(0, 800) || 'plan_failed');
  }
  return JSON.parse(proc.stdout.trim());
}

const report = {
  phase: 'NEXTJS-ADMISSIONS-REIMPORT-UPSERT-SMART-SIBLINGS-1',
  base,
  database: process.env.ODOO_DB,
  login: LOGIN,
  file: '',
  lookup: {},
  dry_run: null,
  sample: null,
  full: null,
  verification: [],
  verdict: '',
  checks: [],
  passed: true,
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  if (!ok) report.passed = false;
}

try {
  const args = parseArgs(process.argv.slice(2));
  report.file = args.file;

  const password = process.env.STUDENT_360_QA_PASSWORD?.trim() || loadAccountPassword(LOGIN);
  const auth = await bffLogin(base, LOGIN, password);
  check('login', auth.ok, base);
  if (!auth.ok) throw new Error('login_failed');

  const sq = auth.schoolId ? `?active_school_id=${auth.schoolId}` : '' ;
  const admissions = await fetchAllAdmissions(auth.jar, auth.schoolId);
  const lookupIndex = await fetchAdmissionLookupIndex(auth.jar, auth.schoolId, admissions);
  const withExtRef = lookupIndex.existing;
  const duplicateRefs = [];
  const seen = new Map();
  for (const a of withExtRef) {
    const key = String(a.external_reference).trim().toLowerCase();
    if (seen.has(key)) duplicateRefs.push(key);
    else seen.set(key, a.id);
  }

  report.lookup = {
    total_admissions: admissions.length,
    with_external_reference: withExtRef.length,
    duplicate_external_references: duplicateRefs.length,
    lookup_supported: withExtRef.length > 0,
    lookup_source: lookupIndex.source,
    detail_fetches: lookupIndex.detail_fetches,
  };

  check('admissions_list', admissions.length > 0, String(admissions.length));
  check(
    'external_reference_in_list',
    withExtRef.length > 0,
    `${withExtRef.length}/${admissions.length} have external_reference`,
  );
  check('no_duplicate_ext_ref', duplicateRefs.length === 0, String(duplicateRefs.length));

  if (args.lookupOnly) {
    report.verdict =
      withExtRef.length > 0 && duplicateRefs.length === 0
        ? 'LOOKUP_OK'
        : 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_BLOCKED';
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.passed ? 0 : 1);
  }

  if (!fs.existsSync(args.file)) {
    check('file_exists', false, args.file);
    report.verdict = 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_BLOCKED';
    throw new Error(`reimport_file_missing: ${args.file}`);
  }

  const unit = spawnSync(
    'npm run test -- src/features/admin/admissions/import/admission-reimport-upsert.test.ts',
    { cwd: ROOT, encoding: 'utf8', shell: true },
  );
  check('unit_tests', unit.status === 0, unit.status === 0 ? 'passed' : unit.stderr?.slice(0, 300));

  const existingJson = lookupIndex.existing;

  const planResult = runPlan(args.file, existingJson, args.sample, args.allowCreate);

  report.dry_run = {
    total_rows: planResult.total_rows,
    matched: planResult.matched,
    patched_planned: planResult.patched_planned,
    created_planned: planResult.created_planned,
    skipped: planResult.skipped,
    missing_external_reference: planResult.missing_external_reference,
    invalid_sibling_lines_json: planResult.invalid_sibling_lines_json,
    potential_duplicates: planResult.potential_duplicates,
    warnings: planResult.warnings_count,
    dry_run_safe: planResult.dry_run_safe,
  };

  check('dry_run_rows', planResult.total_rows > 0, String(planResult.total_rows));
  check('dry_run_safe', planResult.dry_run_safe === true, String(planResult.dry_run_safe));
  check('match_rate', planResult.matched > 0, `${planResult.matched}/${planResult.total_rows}`);

  if (args.dryRun && !args.execute) {
    report.verdict = planResult.dry_run_safe
      ? 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_SAMPLE_PASSED_READY_FOR_FULL_RUN'
      : 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_BLOCKED';
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.passed ? 0 : 1);
  }

  const toRun =
    args.sample > 0
      ? planResult.plan_rows.filter(
          (r) => planResult.sample_rows.includes(r.row_number) && r.action.kind === 'patch',
        )
      : planResult.plan_rows.filter((r) => r.action.kind === 'patch');

  const execStats = {
    sample_size: args.sample || undefined,
    patched: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const row of toRun) {
    const detailRes = await bff(`/admin/admissions/${row.action.admissionId}${sq}`, auth.jar);
    const existingDetail = detailRes.body.data ?? {};
    const patchBody = mergeNonDestructivePatch(existingDetail, row.payload);
    const patchRes = await bff(`/admin/admissions/${row.action.admissionId}${sq}`, auth.jar, {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    });
    if (patchRes.body.success) execStats.patched += 1;
    else {
      execStats.failed += 1;
      execStats.errors.push({
        row_number: row.row_number,
        external_reference: row.external_reference,
        message: patchRes.body.message ?? patchRes.body.error ?? `HTTP ${patchRes.status}`,
      });
    }
  }

  execStats.skipped = planResult.plan_rows.length - toRun.length;

  if (args.sample > 0) report.sample = execStats;
  else {
    report.full = {
      ...execStats,
      total_rows: planResult.total_rows,
      duplicates_detected: 0,
    };
  }

  for (const row of toRun.slice(0, 2)) {
    const detail = await bff(`/admin/admissions/${row.action.admissionId}${sq}`, auth.jar);
    const d = detail.body.data ?? {};
    report.verification.push({
      external_reference: d.external_reference ?? row.external_reference,
      has_siblings: d.has_siblings,
      siblings_raw_text: d.siblings_raw_text ?? null,
      sibling_lines_count: Array.isArray(d.sibling_lines) ? d.sibling_lines.length : 0,
      internal_notes: d.internal_notes ? String(d.internal_notes).slice(0, 80) : null,
      result: detail.body.success ? 'ok' : 'fail',
    });
  }

  const afterCount = (await fetchAllAdmissions(auth.jar, auth.schoolId)).length;
  check('no_duplicate_growth', afterCount === admissions.length, `${admissions.length} → ${afterCount}`);

  if (args.sample > 0 && execStats.failed === 0) {
    report.verdict = 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_SAMPLE_PASSED_READY_FOR_FULL_RUN';
  } else if (!args.sample && execStats.failed === 0 && execStats.patched > 0) {
    report.verdict = 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_COMPLETED';
  } else {
    report.verdict = 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_BLOCKED';
  }
} catch (error) {
  check('runtime', false, error instanceof Error ? error.message : String(error));
  if (!report.verdict) report.verdict = 'NEXTJS_ADMISSIONS_REIMPORT_UPSERT_SMART_SIBLINGS_BLOCKED';
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
