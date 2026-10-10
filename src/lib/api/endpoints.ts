// Central endpoint registry â€” the ONLY place API v1 paths are defined.
// Paths are relative to the API v1 prefix (/api/v1).
//
// Synced with Odoo smart_school_connect â€” includes academic setup API (teaching assignments,
// staff, tracks, setup readiness). Teacher class scope: GET /teacher/classes (+ 403 on detail).
// Parent children: GET /parent/children only. Student homework: /student/homeworks.

export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/me',
    accountActivationVerify: '/auth/account-activation/verify',
    accountActivationSetPassword: '/auth/account-activation/set-password',
    passwordRecoveryRequest: '/auth/password-recovery/request',
    passwordRecoveryVerify: '/auth/password-recovery/verify',
    passwordRecoveryComplete: '/auth/password-recovery/complete',
  },

  public: {
    schoolBranding: '/public/school-branding',
    schoolBrandingLogo: '/public/school-branding/logo',
    accountActivationLinkInspect: '/public/account-activation/inspect',
    accountActivationLinkComplete: '/public/account-activation/complete',
  },

  admin: {
    dashboard: '/admin/dashboard',
    executiveDashboard: '/admin/dashboard/executive',
    schoolBranding: '/admin/school-branding',
    edgeBellSchedule: '/admin/edge/bell-schedule',
    edgeAudioAssets: '/admin/edge/audio-assets',
    edgeAudioAsset: (assetUid: string) => `/admin/edge/audio-assets/${encodeURIComponent(assetUid)}`,
  ¶»§q«^