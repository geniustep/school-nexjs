import { describe, expect, it } from 'vitest';
import {
  OPERATIONAL_ROBOTS_METADATA,
  operationalRobotsRoute,
} from './operational-indexing';

describe('operational indexing policy', () => {
  it('marks every operational page as noindex and nofollow', () => {
    expect(OPERATIONAL_ROBOTS_METADATA).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    });
  });

  it('allows crawlers to read the noindex directive', () => {
    expect(operationalRobotsRoute()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
      },
    });
  });
});
