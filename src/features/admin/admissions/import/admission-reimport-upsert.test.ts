import { describe, expect, it } from 'vitest';
import { mapAdmissionReimportRow, omitEmptyPayloadFields } from './admission-reimport-row-mapper';
import { parseSiblingLinesJson } from './admission-reimport-sibling-json';
import {
  buildExternalReferenceIndex,
  isDryRunSafe,
  mergeNonDestructivePatch,
  planAdmissionReimportRows,
  resolveUpsertAction,
} from './admission-reimport-upsert';

describe('admission reimport upsert', () => {
  const existing = [
    { id: 101, external_reference: 'REF-001' },
    { id: 102, external_reference: 'REF-002' },
  ];

  it('existing external_reference → PATCH', () => {
    const action = resolveUpsertAction('REF-001', new Map([['ref-001', 101]]), [], false);
    expect(action).toEqual({ kind: 'patch', admissionId: 101, external_reference: 'REF-001' });
  });

  it('missing external_reference → skipped', () => {
    const plan = planAdmissionReimportRows(
      [{ row_number: 2, external_reference: '', has_siblings: 'no' }],
      existing,
      { mode: 'upsert', reimport: true },
    );
    expect(plan.skipped).toBe(1);
    expect(plan.missing_external_reference).toBe(1);
    expect(plan.rows[0].action).toEqual({ kind: 'skip', reason: 'missing_external_reference' });
  });

  it('unknown external_reference → skipped without allowCreate', () => {
    const plan = planAdmissionReimportRows(
      [{ row_number: 2, external_reference: 'REF-NEW', has_siblings: 'no' }],
      existing,
      { mode: 'upsert', reimport: true },
    );
    expect(plan.created_planned).toBe(0);
    expect(plan.skipped).toBe(1);
    expect(plan.rows[0].action.kind).toBe('skip');
  });

  it('invalid sibling_lines_json → warning, keeps siblings_raw_text', () => {
    const plan = planAdmissionReimportRows(
      [
        {
          row_number: 2,
          external_reference: 'REF-001',
          sibling_lines_json: '{not-json',
          siblings_levels: 'أخ في الخامس',
        },
      ],
      existing,
      { mode: 'upsert', reimport: true },
    );
    expect(plan.invalid_sibling_lines_json).toBe(1);
    expect(plan.warnings.some((w) => w.code === 'invalid_sibling_lines_json')).toBe(true);
    expect(plan.rows[0].payload.siblings_raw_text).toBeTruthy();
  });

  it('empty field does not clear existing Odoo value in merge', () => {
    const merged = mergeNonDestructivePatch(
      { internal_notes: 'existing note', previous_school: 'Old School' },
      omitEmptyPayloadFields(mapAdmissionReimportRow({ row_number: 1, internal_notes: '' }).payload),
    );
    expect(merged.internal_notes).toBeUndefined();
    expect(merged.previous_school).toBeUndefined();
  });

  it('maps file aliases notes/address/current_school/guardian_phone_secondary', () => {
    const { payload } = mapAdmissionReimportRow({
      row_number: 1,
      notes: 'ملاحظة',
      address: 'الدار البيضاء',
      current_school: 'مدرسة سابقة',
      guardian_phone_secondary: '0612345678',
      siblings_levels: 'أخت في 3AEP',
    });
    expect(payload.internal_notes).toBe('ملاحظة');
    expect(payload.residence_address).toBe('الدار البيضاء');
    expect(payload.previous_school).toBe('مدرسة سابقة');
    expect(payload.guardian_whatsapp).toBe('0612345678');
    expect(payload.siblings_raw_text).toBe('أخت في 3AEP');
  });

  it('parseSiblingLinesJson only keeps explicit fields', () => {
    const parsed = parseSiblingLinesJson(
      JSON.stringify([
        { relationship: 'sister', level_text: '3AEP', invented_field: 'x' },
      ]),
    );
    expect(parsed.lines?.[0]).toEqual(
      expect.objectContaining({ relationship: 'sister', level_text: '3AEP', sequence: 1 }),
    );
    expect((parsed.lines?.[0] as Record<string, unknown>).invented_field).toBeUndefined();
  });

  it('detects duplicate external_reference in Odoo index', () => {
    const idx = buildExternalReferenceIndex([
      { id: 1, external_reference: 'DUP' },
      { id: 2, external_reference: 'DUP' },
    ]);
    expect(idx.duplicateRefs).toEqual(['dup']);
  });

  it('dry-run safe when match rate is high', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      row_number: i + 2,
      external_reference: i % 2 === 0 ? 'REF-001' : 'REF-002',
    }));
    const plan = planAdmissionReimportRows(rows, existing, { mode: 'upsert', reimport: true });
    expect(plan.matched).toBe(10);
    expect(isDryRunSafe(plan)).toBe(true);
  });
});
