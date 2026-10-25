import { describe, expect, it } from 'vitest';
import { getAndroidUpdatePolicy, parseBuild } from './mobile-update-policy';

const latest = { RAQEEM_MOBILE_ANDROID_LATEST_BUILD: '100' };
describe('mobile update policy', () => {
  it('rejects malformed versionCodes', () => {
    for (const value of ['', '0', '-1', '1.2', '1e5', '9007199254740992']) {
      expect(parseBuild(value)).toBe(0);
    }
    expect(parseBuild(' 15 ')).toBe(15);
  });
  it('fails open unless explicitly activated', () => {
    expect(getAndroidUpdatePolicy({}).minimumBuild).toBe(0);
    expect(getAndroidUpdatePolicy({ ...latest, RAQEEM_MOBILE_ANDROID_MIN_BUILD: '90' }).minimumBuild).toBe(0);
  });
  it('requires published latest build and matching explicit consent flag', () => {
    const enabled = {
      ...latest,
      RAQEEM_MOBILE_ANDROID_MIN_BUILD: '90',
      RAQEEM_MOBILE_ANDROID_FORCE_ENABLED: 'true',
    };
    expect(getAndroidUpdatePolicy(enabled).minimumBuild).toBe(90);
    expect(getAndroidUpdatePolicy({ ...enabled, RAQEEM_MOBILE_ANDROID_LATEST_BUILD: '80' }).minimumBuild).toBe(0);
    expect(getAndroidUpdatePolicy({ ...enabled, RAQEEM_MOBILE_ANDROID_LATEST_BUILD: 'nope' }).minimumBuild).toBe(0);
    expect(getAndroidUpdatePolicy({ ...enabled, RAQEEM_MOBILE_ANDROID_FORCE_ENABLED: 'false' }).minimumBuild).toBe(0);
  });
  it('returns only trusted Google Play link', () => {
    expect(getAndroidUpdatePolicy({}).playStoreUrl)
      .toBe('https://play.google.com/store/apps/details?id=ma.raqeem.app');
  });
});
