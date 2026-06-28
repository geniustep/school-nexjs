import { describe, expect, it } from 'vitest';
import ar from '../../../../../messages/ar.json';
import en from '../../../../../messages/en.json';
import fr from '../../../../../messages/fr.json';
import es from '../../../../../messages/es.json';

type Json = Record<string, unknown>;

function getRepairCenterStrings(messages: Json): string[] {
  const root = messages as unknown as {
    admin?: {
      student360?: {
        financeWorkspace?: { repairCenter?: unknown };
      };
    };
  };
  const repairCenter = root.admin?.student360?.financeWorkspace?.repairCenter;
  expect(repairCenter, 'repairCenter i18n subtree must exist').toBeTruthy();

  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      out.push(value);
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value)) walk(v);
    }
  };
  walk(repairCenter);
  return out;
}

// Technical jargon that must never leak into the admin-facing UI copy.
const BANNED_TOKENS = ['odoo', 'api', 'orm', 'traceback', 'endpoint', 'server'];
const BANNED_AR_TOKENS = ['خادم', 'الخادم'];

const LOCALES: Array<[string, Json]> = [
  ['ar', ar as unknown as Json],
  ['en', en as unknown as Json],
  ['fr', fr as unknown as Json],
  ['es', es as unknown as Json],
];

describe('repair center i18n copy', () => {
  it('exposes the repairCenter subtree for every locale', () => {
    for (const [, messages] of LOCALES) {
      expect(getRepairCenterStrings(messages).length).toBeGreaterThan(0);
    }
  });

  it('never leaks technical terms in any locale', () => {
    for (const [locale, messages] of LOCALES) {
      const strings = getRepairCenterStrings(messages);
      for (const str of strings) {
        const lower = str.toLowerCase();
        for (const token of BANNED_TOKENS) {
          // word-ish boundary check to avoid false positives inside normal words
          const regex = new RegExp(`(^|[^a-z])${token}([^a-z]|$)`, 'i');
          expect(
            regex.test(lower),
            `[${locale}] technical token "${token}" found in: ${str}`,
          ).toBe(false);
        }
      }
    }
  });

  it('provides adopt-schedule action labels and dual-selection copy in every locale', () => {
    for (const [locale, messages] of LOCALES) {
      const repairCenter = (
        messages as unknown as {
          admin: { student360: { financeWorkspace: { repairCenter: Json } } };
        }
      ).admin.student360.financeWorkspace.repairCenter;
      const actionLabels = repairCenter.actionLabels as Json;
      const planSelection = repairCenter.planSelection as Json;
      const previewMode = repairCenter.previewMode as Json;
      expect(actionLabels.adoptCorrectSchedule, `[${locale}] adoptCorrectSchedule`).toBeTruthy();
      expect(planSelection.adoptTitle, `[${locale}] adoptTitle`).toBeTruthy();
      expect(planSelection.officialLegend, `[${locale}] officialLegend`).toBeTruthy();
      expect(planSelection.sourceLegend, `[${locale}] sourceLegend`).toBeTruthy();
      expect(planSelection.samePlanError, `[${locale}] samePlanError`).toBeTruthy();
      expect(previewMode.relinkUnpaid, `[${locale}] relinkUnpaid`).toBeTruthy();
      expect(previewMode.adoptScheduleAsIs, `[${locale}] adoptScheduleAsIs`).toBeTruthy();
    }
  });

  it('never leaks Arabic technical terms in the Arabic copy', () => {
    const strings = getRepairCenterStrings(ar as unknown as Json);
    for (const str of strings) {
      for (const token of BANNED_AR_TOKENS) {
        expect(str.includes(token), `Arabic technical token "${token}" found in: ${str}`).toBe(
          false,
        );
      }
    }
  });
});
