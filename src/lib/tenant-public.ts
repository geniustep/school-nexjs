/** Display name for a tenant slug — optional env override, else the slug itself. */
export function tenantDisplayName(code: string): string {
  const fromEnv = process.env[`TENANT_NAME_${code.toUpperCase().replace(/-/g, '_')}`]?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : code;
}
