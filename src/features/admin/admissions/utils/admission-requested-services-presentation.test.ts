import { describe, expect, it } from 'vitest';
import {
  sliceRequestedServiceLabels,
} from './admission-requested-services';

describe('admission requested-services presentation', () => {
  const services = [
    { id: 1, code: 'a', name: 'Alpha', active: true },
    { id: 2, code: 'b', name: 'Beta', active: false },
    { id: 3, code: 'c', name: 'Gamma', active: true },
    { id: 4, code: 'd', name: 'Delta', active: true },
  ];

  it('shows first maxVisible services and +N remainder', () => {
    expect(sliceRequestedServiceLabels(services, 2)).toEqual({
      visible: [services[0], services[1]],
      remaining: 2,
    });
    expect(sliceRequestedServiceLabels(services, 10)).toEqual({
      visible: services,
      remaining: 0,
    });
  });

  it('treats empty selection as zero visible / zero remaining', () => {
    expect(sliceRequestedServiceLabels([], 2)).toEqual({
      visible: [],
      remaining: 0,
    });
  });
});
