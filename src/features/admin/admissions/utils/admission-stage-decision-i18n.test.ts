import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getAdmissionDecisionOptions } from './admission-decision-options';
import { getAdmissionManualStageOptions } from './admission-stage-options';

const require = createRequire(import.meta.url);
const root = path.resolve(__dirname, '../../../../../messages');

function loadMessages(lang: string) {
  return require(path.join(root, `${lang}.json`)) as {
    admin: {
      admissions: {
        states: Record<string, string>;
        processingStages: Record<string, string>;
        decisions: Record<string, string>;
        schoolDecision: Record<string, string>;
        actions: Record<string, string>;
        decision: Record<string, string>;
        uiStages: Record<string, string>;
        primaryAction: Record<string, string>;
      };
    };
  };
}

describe('stage/decision translations', () => {
  for (const lang of ['ar', 'en', 'fr', 'es'] as const) {
    it(`provides labels for manual stages and decisions in ${lang}`, () => {
      const adm = loadMessages(lang).admin.admissions;
      for (const stage of getAdmissionManualStageOptions()) {
        expect(adm.processingStages[stage]).toBeTruthy();
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
      expect(adm.primaryAction.markReady).toBeTruthy();
      expect(adm.uiStages.ready_for_registration).toBeTruthy();
      expect(adm.uiStages.accepted).toBeTruthy();
    });
  }

  it('uses a single Arabic under_review wording', () => {
    const ar = loadMessages('ar').admin.admissions;
    expect(ar.states.under_review).toBe('قيد الدراسة');
    expect(ar.uiStages.in_evaluation).toBe('قيد الدراسة');
  });

  it('Arabic accepted decision is plain مقبول (not auto-ready)', () => {
    const ar = loadMessages('ar').admin.admissions;
    expect(ar.decisions.accepted).toBe('مقبول');
    expect(ar.primaryAction.markReady).toBe('جاهز للتسجيل');
  });
});
