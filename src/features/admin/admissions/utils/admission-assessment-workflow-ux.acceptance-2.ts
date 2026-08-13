import { expect, it } from 'vitest';
import { resolveAcceptanceRegistrationMode, shouldShowOffersList } from './admission-acceptance-registration-ux';
import type { AdmissionDetail } from '@/types/admission';
it('65-66. initial mode', () => {
  const x = resolveAcceptanceRegistrationMode({ id: 1, student_name: 'x', state: 'new', allowed_actions: {} } as AdmissionDetail);
  expect(x).toBe('before_decision');
  expect(shouldShowOffersList(x)).toBe(false);
});
