/**
 * Admissions list URL navigation: user filter / view actions push history;
 * silent hydration / debounce normalization may replace.
 */
export type AdmissionsListUrlNavTrigger =
  | 'user_service_card'
  | 'user_service_filter'
  | 'user_service_chip_clear'
  | 'user_clear_filters'
  | 'user_status_filter'
  | 'user_academic_filter'
  | 'user_view_switch'
  | 'search_debounce'
  | 'url_hydration'
  | 'other';

export type AdmissionsListUrlNavMode = 'push' | 'replace' | 'skip';

export function resolveAdmissionsListUrlNavigationMode(input: {
  trigger: AdmissionsListUrlNavTrigger;
  nextQs: string;
  currentQs: string;
}): AdmissionsListUrlNavMode {
  if (input.nextQs === input.currentQs) return 'skip';
  switch (input.trigger) {
    case 'user_service_card':
    case 'user_service_filter':
    case 'user_service_chip_clear':
    case 'user_clear_filters':
    case 'user_status_filter':
    case 'user_academic_filter':
    case 'user_view_switch':
      return 'push';
    case 'search_debounce':
    case 'url_hydration':
    case 'other':
    default:
      return 'replace';
  }
}

export function isUserServiceFilterNavTrigger(
  trigger: AdmissionsListUrlNavTrigger,
): boolean {
  return (
    trigger === 'user_service_card' ||
    trigger === 'user_service_filter' ||
    trigger === 'user_service_chip_clear' ||
    trigger === 'user_clear_filters'
  );
}
