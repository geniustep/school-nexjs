import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('general communication Arabic terminology', () => {
  const ar = JSON.parse(
    readFileSync(join(process.cwd(), 'messages/ar.json'), 'utf8'),
  ) as {
    communication: {
      general: Record<string, unknown>;
      recipients: Record<string, string>;
    };
  };

  it('uses المستفيدون / حالة التوصل and avoids جمهور in the new journey strings', () => {
    expect(ar.communication.general.beneficiaries).toBe('المستفيدون');
    expect(ar.communication.recipients.deliveryStatusTitle).toBe('حالة التوصل');
    expect(ar.communication.recipients.beneficiaryLabels).toBe('المستفيدون');
    expect(ar.communication.general.title).toBe('التواصل العام');
    expect(ar.communication.general.newCommunication).toBe('تواصل جديد');

    const journey = JSON.stringify(ar.communication.general);
    expect(journey).not.toContain('جمهور');
    expect(journey).not.toContain('البلاغات المدرسية');
    expect(ar.communication.recipients.deliveryStatusTitle).not.toContain('جمهور');
  });
});
