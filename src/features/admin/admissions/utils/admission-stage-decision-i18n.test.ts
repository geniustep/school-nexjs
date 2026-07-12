import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getAdmissionDecisionOptions } from './admission-decision-options';
import { getAdmissionManualStageOptions } from './admission-stage-options';

const require = createRequire(import.meta.url);
const root = path.resolve(__dirname, '../../../../../messages');

function loadMessages(lang: string) {
  return require(path.join(root, `${lang}.json`)) as {
    admin: { admissions: Record<string, Record<string, string>> };
  };
}

describe('stage/decision translations', () => {
  for (const lang of ['ar', 'en', 'fr', 'es'] as const) {
    it(`provides labels for manual stages and decisions in ${lang}`, () => {
      const adm = loadMessages(lang).admin.admissions;
      for (const stage of getAdmissionManualStageOptions()) {
        expect(adm.states[stage]).toBeTruthy();
      }
      for (const decision of getAdmissionDecisionOptions()) {
        if (decision === 'rejected') {
          expect(adm.schoolDecision.rejected).toBeTruthy();
        } else {
          expect(adm.decisions[decision]).toBeTruthy();
        }
      }
      expect(adm.states.under_review).toBeTruthy();
      expect(adm.actions.changeFollowUp).toBeTruthy();
      expect(adm.actions.makeDecision).toBeTruthy();
      expect(adm.decision.conditions).toBeTruthy();
    });
  }

  it('uses a single Arabic under_review wording', () => {
    const ar = loadMessages('ar').admin.admissions;
    expect(ar.states.under_review).toBe('قيد الدراسة');
    expect(ar.uiStages.in_evaluation).toBe('قيد الدراسة');
  });
});
