// Admin portal mutation gate — RBAC-1B uses permissions[] per action; not a global read-only shell.

/** When true, hides all admin mutation controls globally (emergency flag only). */
export function isAdminReadOnlyPhase(): boolean {
  return false;
}
