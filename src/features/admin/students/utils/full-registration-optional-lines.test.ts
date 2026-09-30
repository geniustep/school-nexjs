import { describe, expect, it } from 'vitest';
import {
  localizedEnrollmentServiceName,
  readFullRegistrationOptionalLines,
} from './full-registration-optional-lines';

describe('full registration optional service identity', () => {
  it('preserves bilingual identity, refundability and free flags from plan detail lines', () => {
    const lines = readFullRegistrationOptionalLines({
      lines: [
        {
          line_id: 9956,
          fee_type_id: 1310,
          fee_type_name: 'النقل',
          fee_type_name_ar: 'النقل',
          fee_type_name_fr: 'Transport scolaire',
          fee_type_code: 'TRANSPORT',
          fee_type_category: 'transport',
          amount: 0,
          is_optional: true,
          is_refundable: false,
          is_free: true,
        },
      ],
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      line_id: 9956,
      fee_type_id: 1310,
      fee_type_name: 'النقل',
      fee_type_name_ar: 'النقل',
      fee_type_name_fr: 'Transport scolaire',
      fee_type_code: 'TRANSPORT',
      fee_type_category: 'transport',
      is_optional: true,
      is_refundable: false,
      is_free: true,
    });
  });

  it('selects the Arabic or French label without changing service identity', () => {
    const [line] = readFullRegistrationOptionalLines({
      optional_lines: [
        {
          line_id: 1,
          fee_type_id: 1310,
          fee_type_name: 'النقل',
          fee_type_name_ar: 'النقل المدرسي',
          fee_type_name_fr: 'Transport scolaire',
          fee_type_code: 'TRANSPORT',
          is_optional: true,
        },
      ],
    });

    expect(localizedEnrollmentServiceName(line, 'ar')).toBe('النقل المدرسي');
    expect(localizedEnrollmentServiceName(line, 'fr')).toBe('Transport scolaire');
    expect(line.fee_type_id).toBe(1310);
  });

  it('falls back to the legacy name and then code when a localized label is absent', () => {
    const legacy = {
      line_id: 2,
      fee_type_id: 1311,
      fee_type_name: 'المطعم',
      fee_type_code: 'CANTEEN',
    };
    expect(localizedEnrollmentServiceName(legacy, 'fr')).toBe('المطعم');

    const codeOnly = {
      line_id: 3,
      fee_type_id: 1312,
      fee_type_name: '',
      fee_type_code: 'DAYCARE',
    };
    expect(localizedEnrollmentServiceName(codeOnly, 'fr')).toBe('DAYCARE');
  });
});
