import { describe, expect, it } from 'vitest';
import {
  buildCreateAdmissionPayload,
  emptyAdmissionCreateForm,
} from './admission-create-payload';

describe('create payload requested_service_ids', () => {
  it('always includes requested_service_ids, including empty array', () => {
    const form = emptyAdmissionCreateForm('2026-07-14');
    const emptyPayload = buildCreateAdmissionPayload(form, 3, []);
    expect(emptyPayload).toHaveProperty('requested_service_ids');
    expect(emptyPayload.requested_service_ids).toEqual([]);

    form.requested_service_ids = [5, 5, 8, 0, -1];
    const withIds = buildCreateAdmissionPayload(form, 3, []);
    expect(withIds.requested_service_ids).toEqual([5, 8]);
  });

  it('keeps empty-string stripping for other fields while preserving [] services', () => {
    const form = emptyAdmissionCreateForm('2026-07-14');
    form.internal_notes = '';
    form.requested_service_ids = [];
    const payload = buildCreateAdmissionPayload(form, 9, []);
    expect(payload.internal_notes).toBeUndefined();
    expect(payload.requested_service_ids).toEqual([]);
  });
});
