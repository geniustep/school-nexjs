export interface FullRegistrationValidationElement {
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
  focus: (options?: FocusOptions) => void;
}

export interface FullRegistrationValidationRoot {
  querySelector: (selector: string) => FullRegistrationValidationElement | null;
}

function escapeValidationKey(key: string): string {
  return key.replace(/(["\\])/g, '\\$1');
}

export function focusFirstFullRegistrationError(
  fieldOrder: string[],
  root?: FullRegistrationValidationRoot | null,
): boolean {
  const key = fieldOrder[0];
  if (!key) return false;
  const resolvedRoot =
    root ??
    (typeof document !== 'undefined'
      ? (document as unknown as FullRegistrationValidationRoot)
      : null);
  if (!resolvedRoot) return false;
  const element = resolvedRoot.querySelector(
    `[data-validation-key="${escapeValidationKey(key)}"]`,
  );
  if (!element) return false;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.focus({ preventScroll: true });
  return true;
}
