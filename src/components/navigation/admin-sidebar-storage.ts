/** Official admin sidebar persistence (groups accordion + collapsed rail). */

export const ADMIN_SIDEBAR_GROUPS_KEY = 'raqeem.admin.sidebar.groups';
export const ADMIN_SIDEBAR_COLLAPSED_KEY = 'raqeem.admin.sidebar.collapsed';

/** Legacy experiment keys — read once for migration, then rewritten to official keys. */
const LEGACY_GROUPS_KEY = 'raqeem.admin.sidebar.focus-v2.groups';
const LEGACY_COLLAPSED_KEY = 'raqeem.admin.sidebar.focus-v2.collapsed';

export function readAdminSidebarGroups(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw =
      localStorage.getItem(ADMIN_SIDEBAR_GROUPS_KEY) ?? localStorage.getItem(LEGACY_GROUPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAdminSidebarGroups(next: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_SIDEBAR_GROUPS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readAdminSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw =
      localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) ??
      localStorage.getItem(LEGACY_COLLAPSED_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export function writeAdminSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}
