import { expect, it } from 'vitest';
import { loadMessages } from './admission-assessment-workflow-ux.test-support';
it('89-96. locales + original repo markers', () => {
  for (const locale of ['ar', 'en', 'fr', 'es']) {
    const messages = loadMessages(locale);
    expect(messages.admin.admissions.tabs.offer_registration).toBeTruthy();
    expect(messages.admin.admissions.processingStages.initial_follow_up).toBeTruthy();
    expect(messages.admin.admissions.journey.assessment).toBeTruthy();
    expect(messages.admin.admissions.acceptance.beforeDecision).toBeTruthy();
  }
  expect(process.cwd().replace(/\\/g, '/')).toMatch(/school-nexjs$/);
});
