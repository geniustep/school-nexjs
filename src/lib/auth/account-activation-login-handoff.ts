const ACTIVATION_LOGIN_KEY = 'raqeem.account-activation.login:v1';
let consumedActivationLogin: string | undefined;

function normalizedLogin(value: string | null): string {
  const login = value?.trim() ?? '';
  return login.length <= 256 ? login : '';
}

export function readActivationLoginHandoff(): string {
  if (typeof window === 'undefined') return '';
  try {
    return normalizedLogin(window.sessionStorage.getItem(ACTIVATION_LOGIN_KEY));
  } catch {
    return '';
  }
}

export function storeActivationLoginHandoff(login: string): void {
  consumedActivationLogin = undefined;
  if (typeof window === 'undefined') return;
  const normalized = normalizedLogin(login);
  if (!normalized) return;
  try {
    window.sessionStorage.setItem(ACTIVATION_LOGIN_KEY, normalized);
  } catch {
    // The transition still works if browser storage is unavailable.
  }
}

export function consumeActivationLoginHandoff(): string {
  if (consumedActivationLogin !== undefined) return consumedActivationLogin;
  consumedActivationLogin = readActivationLoginHandoff();
  removeStoredActivationLoginHandoff();
  return consumedActivationLogin;
}

export function clearActivationLoginHandoff(): void {
  consumedActivationLogin = undefined;
  removeStoredActivationLoginHandoff();
}

function removeStoredActivationLoginHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ACTIVATION_LOGIN_KEY);
  } catch {
    // Storage is an optional convenience only.
  }
}
