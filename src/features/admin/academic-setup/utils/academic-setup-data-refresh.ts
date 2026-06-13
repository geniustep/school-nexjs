/** Reload hooks for academic setup list/options endpoints (no shared query cache). */
export type AcademicSetupReloadBundle = {
  levels?: () => void;
  levelOptions?: () => void;
  classes?: () => void;
  readiness?: () => void;
  tracks?: () => void;
};

export function refreshAcademicSetupData(bundle: AcademicSetupReloadBundle): void {
  bundle.levels?.();
  bundle.levelOptions?.();
  bundle.classes?.();
  bundle.readiness?.();
  bundle.tracks?.();
}
