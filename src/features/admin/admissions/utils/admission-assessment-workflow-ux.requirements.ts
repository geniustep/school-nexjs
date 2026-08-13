import { expect, it } from 'vitest';
import { normalizeAdmissionRegistrationRequirements, partitionRegistrationRequirements } from './admission-assessment-workflow-contract';
it('76-78. registration requirement partition', () => {
  const parts = partitionRegistrationRequirements(normalizeAdmissionRegistrationRequirements([
    { severity: 'blocking', message: 'a' },
    { severity: 'warning', message: 'b' },
    { severity: 'information', code: 'multi_guardian', message: 'c' },
  ]));
  expect(parts.blocking).toHaveLength(1);
  expect(parts.warning).toHaveLength(1);
  expect(parts.information).toHaveLength(1);
});
