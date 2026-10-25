/** Public Android update policy; no secrets or tenant DB access. */
export type AndroidUpdatePolicy = {
  latestBuild: number;
  minimumBuild: number;
  playStoreUrl: string;
};
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ma.raqeem.app';

export function parseBuild(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value.trim())) return 0;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? parsed : 0;
}
export function getAndroidUpdatePolicy(env: Readonly<Record<string, string | undefined>> = process.env): AndroidUpdatePolicy {
  const latestBuild = parseBuild(env.RAQEEM_MOBILE_ANDROID_LATEST_BUILD);
  const configuredMinimum = parseBuild(env.RAQEEM_MOBILE_ANDROID_MIN_BUILD);
  const forceEnabled = env.RAQEEM_MOBILE_ANDROID_FORCE_ENABLED === 'true';
  const minimumBuild =
    forceEnabled && latestBuild > 0 && configuredMinimum > 0 && configuredMinimum <= latestBuild
      ? configuredMinimum
      : 0;
  return { latestBuild, minimumBuild, playStoreUrl: PLAY_STORE_URL };
}
