/**
 * One-shot admission reimport plan runner (invoked with node --experimental-strip-types).
 * Writes JSON plan to stdout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAdmissionReimportFile } from '../src/features/admin/admissions/import/admission-reimport-parser.ts';
import { buildAdmissionReimportReferenceLookup } from '../src/features/admin/admissions/import/admission-reimport-reference.ts';
import {
  isDryRunSafe,
  planAdmissionReimportRows,
  selectSampleRows,
} from '../src/features/admin/admissions/import/admission-reimport-upsert.ts';
import type { AdmissionExistingRef } from '../src/features/admin/admissions/import/admission-reimport-types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = process.env.ADMISSION_REIMPORT_CONFIG;
if (!configPath || !fs.existsSync(configPath)) {
  console.error(JSON.stringify({ error: 'missing ADMISSION_REIMPORT_CONFIG' }));
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
  file: string;
  sample: number;
  allowCreate: boolean;
  existing: AdmissionExistingRef[];
};

const rows = await parseAdmissionReimportFile(config.file);
const refs = buildAdmissionReimportReferenceLookup(null);
const plan = planAdmissionReimportRows(
  rows,
  config.existing,
  { mode: 'upsert', reimport: true, allowCreate: config.allowCreate },
  refs,
);

const sampleRows =
  config.sample > 0 ? selectSampleRows(plan, config.sample).map((r) => r.row_number) : [];

console.log(
  JSON.stringify({
    total_rows: plan.total_rows,
    matched: plan.matched,
    patched_planned: plan.patched_planned,
    created_planned: plan.created_planned,
    skipped: plan.skipped,
    missing_external_reference: plan.missing_external_reference,
    invalid_sibling_lines_json: plan.invalid_sibling_lines_json,
    potential_duplicates: plan.potential_duplicates,
    warnings_count: plan.warnings.length,
    dry_run_safe: isDryRunSafe(plan),
    sample_rows: sampleRows,
    plan_rows: plan.rows,
  }),
);
