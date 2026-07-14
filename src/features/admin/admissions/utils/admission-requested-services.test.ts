import { describe, expect, it } from 'vitest';
import {
  dedupeRequestedServiceIds,
  isAdmissionRequestedServicesLocked,
  mapAdmissionRequestedServicesError,
  normalizeAdmissionRequestedService,
  normalizeAdmissionRequestedServices,
  normalizeHasRequestedServices,
  normalizeRequestedServiceCounts,
  normalizeRequestedServiceIds,
  sliceRequestedServiceLabels,
} from './admission-requested-services';

describe('admission-requested-services normalize + helpers', () => {
  it('dedupes positive ids and drops invalid values', () => {
    expect(dedupeRequestedServiceIds([1, 1, 2, 0, -3, 2.9, Number.NaN])).toEqual([1, 2]);
  });

  it('normalizes requested_service_ids from numbers, strings, and objects', () => {
    expect(
      normalizeRequestedServiceIds([1, '2', { id: 3 }, { id: '3' }, null, 'x']),
    ).toEqual([1, 2, 3]);
  });

  it('normalizes service catalog rows without inventing names from hardcoded codes', () => {
    expect(
      normalizeAdmissionRequestedService({
        id: 10,
        code: 'svc_a',
        name: 'Service A',
        active: true,
      }),
    ).toEqual({ id: 10, code: 'svc_a', name: 'Service A', active: true });

    expect(
      normalizeAdmissionRequestedService({ id: 11, code: 'svc_b', active: false }),
    ).toEqual({ id: 11, code: 'svc_b', name: 'svc_b', active: false });

    expect(normalizeAdmissionRequestedService({ id: 0 })).toBeNull();
    expect(
      normalizeAdmissionRequestedServices([
        { id: 1, name: 'One' },
        { id: 1, name: 'Dup' },
        { id: 2, name: 'Two', active: false },
      ]),
    ).toEqual([
      { id: 1, code: '', name: 'One', active: true },
      { id: 2, code: '', name: 'Two', active: false },
    ]);
  });

  it('derives has_requested_services from boolean or presence of ids/services', () => {
    expect(normalizeHasRequestedServices(true)).toBe(true);
    expect(normalizeHasRequestedServices(false, [{ id: 1, code: '', name: 'A', active: true }])).toBe(
      false,
    );
    expect(normalizeHasRequestedServices(undefined, undefined, [4])).toBe(true);
    expect(normalizeHasRequestedServices(undefined, [], [])).toBe(false);
  });

  it('normalizes dashboard service counts and skips invalid rows', () => {
    expect(
      normalizeRequestedServiceCounts([
        { service_id: 1, name: 'Alpha', count: 4, code: 'a' },
        { service_id: 1, name: 'Dup', count: 9 },
        { service_id: '2', name: '', count: '3', code: 'b' },
        { service_id: 0, name: 'Bad', count: 1 },
      ]),
    ).toEqual([
      { service_id: 1, code: 'a', name: 'Alpha', count: 4 },
      { service_id: 2, code: 'b', name: 'b', count: 3 },
    ]);
  });

  it('accepts dashboard count rows that use id instead of service_id', () => {
    expect(
      normalizeRequestedServiceCounts([
        { id: 9101, code: 'svc_x', name: 'Service X', count: 1 },
        { id: 9102, code: 'svc_y', name: 'Service Y', count: 0 },
      ]),
    ).toEqual([
      { service_id: 9101, code: 'svc_x', name: 'Service X', count: 1 },
      { service_id: 9102, code: 'svc_y', name: 'Service Y', count: 0 },
    ]);
  });

  it('slices labels for +N overflow', () => {
    const services = [
      { id: 1, code: '', name: 'A', active: true },
      { id: 2, code: '', name: 'B', active: true },
      { id: 3, code: '', name: 'C', active: false },
    ];
    expect(sliceRequestedServiceLabels(services, 2)).toEqual({
      visible: services.slice(0, 2),
      remaining: 1,
    });
    expect(sliceRequestedServiceLabels(services, 0)).toEqual({
      visible: [],
      remaining: 3,
    });
  });

  it('locks after registration / linked student', () => {
    expect(
      isAdmissionRequestedServicesLocked({
        application_status: 'registered',
        registration_status: null,
        student_id: null,
      }),
    ).toBe(true);
    expect(
      isAdmissionRequestedServicesLocked({
        application_status: 'accepted',
        registration_status: 'registered',
        student_id: null,
      }),
    ).toBe(true);
    expect(
      isAdmissionRequestedServicesLocked({
        application_status: 'new',
        registration_status: null,
        student_id: 99,
      }),
    ).toBe(true);
    expect(
      isAdmissionRequestedServicesLocked({
        application_status: 'new',
        registration_status: null,
        student_id: null,
      }),
    ).toBe(false);
  });

  it('maps known backend error codes and falls back to unknown', () => {
    const t = (key: string) => key;
    expect(mapAdmissionRequestedServicesError('admission_requested_service_inactive', t)).toBe(
      'admin.admissions.requestedServices.errors.admission_requested_service_inactive',
    );
    expect(mapAdmissionRequestedServicesError('other', t)).toBe(
      'admin.admissions.requestedServices.errors.unknown',
    );
    expect(mapAdmissionRequestedServicesError(undefined, t)).toBe(
      'admin.admissions.requestedServices.errors.unknown',
    );
  });
});
