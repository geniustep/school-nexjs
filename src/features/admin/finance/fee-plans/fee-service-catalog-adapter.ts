import type { FeeType } from '@/types/finance';
import type { FinanceServiceCatalogItem } from '@/features/admin/student-finance/types';

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function equivalentCodes(code: string): Set<string> {
  if (code === 'REGISTRATION' || code === 'REG') return new Set(['REGISTRATION', 'REG']);
  return new Set([code]);
}

/**
 * UI catalog comes from /admin/finance/services, while existing fee-plan payloads
 * still require the backing school.fee.type id. Match by stable service code so we
 * never assume the two endpoints expose the same numeric id.
 */
export function feeTypesBackedByServiceCatalog(
  services: FinanceServiceCatalogItem[],
  feeTypes: FeeType[],
): FeeType[] {
  const activeServices = services.filter((service) => service.active !== false);
  const activeFeeTypes = feeTypes.filter((type) => type.active !== false);

  return activeServices.flatMap((service) => {
    const serviceCode = normalizeCode(service.code);
    if (!serviceCode) return [];
    const accepted = equivalentCodes(serviceCode);
    const matches = activeFeeTypes.filter((type) => accepted.has(normalizeCode(type.code)));
    if (matches.length !== 1) return [];
    const backing = matches[0];
    return [{
      ...backing,
      code: service.code || backing.code,
      name: service.name || backing.name,
      category: service.category ?? backing.category,
      frequency: service.frequency ?? backing.frequency,
      is_mandatory: service.is_mandatory ?? backing.is_mandatory,
      description: service.description ?? backing.description,
      // Intentionally never copy service.default_amount: price belongs to fee-plan lines.
    } satisfies FeeType];
  });
}
