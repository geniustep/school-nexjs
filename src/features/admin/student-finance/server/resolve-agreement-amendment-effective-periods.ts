import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { getStoredTenantSlug } from '@/lib/api/odoo-backend';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type {
  AgreementAmendmentPeriodOption,
  AgreementAmendmentRequestPayload,
} from '../types/agreement-amendment';
import type { FinancialAgreement } from '../types';
import {
  readAgreementLineBootstrap,
  scanRangeForAcademicYear,
} from '../utils/agreement-amendment-period-bootstrap';
import { normalizeAgreementAmendmentPeriodOptions } from '../utils/normalize-agreement-amendment-period-options';

type OdooEffectivePeriodRecord = {
  id: number;
  period_key?: string;
  label?: string;
  period_start?: string;
  period_end?: string;
  due_date?: string;
};

const PERIOD_CACHE = new Map<string, AgreementAmendmentPeriodOption[]>();

function cacheKey(tenant: string | undefined, academicYearId: number): string {
  return `${tenant ?? 'default'}:ay:${academicYearId}`;
}

async function fetchOdooAgreement(
  agreementId: number,
  sessionId: string | null,
  tenant?: string,
): Promise<FinancialAgreement | null> {
  const result = await odooApiFetch<FinancialAgreement>(
    endpoints.admin.financialAgreement(agreementId),
    { method: 'GET', sessionId, tenant },
  );
  if (result.kind !== 'json' || !result.body.success || !result.body.data) return null;
  return result.body.data;
}

async function fetchOdooAcademicYearDates(
  academicYearId: number,
  sessionId: string | null,
  tenant?: string,
): Promise<{ date_start?: string; date_end?: string } | null> {
  const result = await odooApiFetch<{ items?: Array<{ id: number; date_start?: string; date_end?: string }> }>(
    endpoints.admin.financeAcademicYears,
    { method: 'GET', sessionId, tenant, query: { page: '1', page_size: '100' } },
  );
  if (result.kind !== 'json' || !result.body.success) return null;
  const items = result.body.data?.items ?? (Array.isArray(result.body.data) ? result.body.data : []);
  const match = items.find((item) => item.id === academicYearId);
  return match ?? null;
}

async function tryFetchOdooEffectivePeriodsList(
  studentId: number,
  agreementId: number,
  sessionId: string | null,
  tenant?: string,
): Promise<AgreementAmendmentPeriodOption[] | null> {
  const path = endpoints.admin.studentFinanceAgreementAmendmentEffectivePeriods(studentId);
  const result = await odooApiFetch<unknown>(path, {
    method: 'GET',
    sessionId,
    tenant,
    query: { agreement_id: String(agreementId) },
  });
  if (result.kind !== 'json' || !result.body.success) return null;
  const normalized = normalizeAgreementAmendmentPeriodOptions(result.body.data);
  return normalized.length ? normalized : null;
}

async function probeBillingPeriodId(input: {
  studentId: number;
  agreementId: number;
  periodId: number;
  line: AgreementAmendmentRequestPayload['line'];
  sessionId: string | null;
  tenant?: string;
}): Promise<OdooEffectivePeriodRecord | null> {
  const payload: AgreementAmendmentRequestPayload = {
    agreement_id: input.agreementId,
    operation_type: 'modify_line',
    effective_period_id: input.periodId,
    reason: 'period discovery',
    line: input.line,
  };
  const result = await odooApiFetch<{
    effective_period?: OdooEffectivePeriodRecord;
    allowed?: boolean;
  }>(endpoints.admin.studentFinanceAgreementAmendmentPreview(input.studentId), {
    method: 'POST',
    sessionId: input.sessionId,
    tenant: input.tenant,
    body: payload,
  });
  if (result.kind !== 'json' || !result.body.success || !result.body.data?.effective_period?.id) {
    return null;
  }
  return result.body.data.effective_period;
}

async function discoverBillingPeriodsViaPreviewProbe(input: {
  studentId: number;
  agreementId: number;
  academicYearId: number;
  line: AgreementAmendmentRequestPayload['line'];
  sessionId: string | null;
  tenant?: string;
}): Promise<AgreementAmendmentPeriodOption[]> {
  const { start, end } = scanRangeForAcademicYear(input.academicYearId);
  const ids = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const batchSize = 20;
  const discovered = new Map<number, AgreementAmendmentPeriodOption>();

  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batch = ids.slice(offset, offset + batchSize);
    const results = await Promise.all(
      batch.map(async (periodId) => {
        const period = await probeBillingPeriodId({
          studentId: input.studentId,
          agreementId: input.agreementId,
          periodId,
          line: input.line,
          sessionId: input.sessionId,
          tenant: input.tenant,
        });
        if (!period?.id) return null;
        return {
          id: period.id,
          label:
            period.label ??
            period.period_key ??
            period.period_start ??
            String(period.id),
          periodKey: period.period_key ?? null,
          periodStart: period.period_start ?? null,
          periodEnd: period.period_end ?? null,
        } satisfies AgreementAmendmentPeriodOption;
      }),
    );
    for (const option of results) {
      if (option) discovered.set(option.id, option);
    }
  }

  return [...discovered.values()].sort((a, b) => {
    const aKey = a.periodKey ?? a.label;
    const bKey = b.periodKey ?? b.label;
    return aKey.localeCompare(bKey);
  });
}

export async function resolveAgreementAmendmentEffectivePeriods(input: {
  studentId: number;
  agreementId: number;
}): Promise<ApiResponse<AgreementAmendmentPeriodOption[]>> {
  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  const tenant = await getStoredTenantSlug();

  if (!sessionId) {
    return {
      success: false,
      error: { code: 'unauthorized', message: 'Session required.', details: {} },
      meta: {},
    };
  }

  const listed = await tryFetchOdooEffectivePeriodsList(
    input.studentId,
    input.agreementId,
    sessionId,
    tenant ?? undefined,
  );
  if (listed?.length) {
    return { success: true, data: listed, meta: { source: 'odoo_list' } };
  }

  const agreement = await fetchOdooAgreement(input.agreementId, sessionId, tenant ?? undefined);
  if (!agreement?.academic_year_id) {
    return {
      success: false,
      error: {
        code: 'agreement_not_found',
        message: 'Financial agreement or academic year was not found.',
        details: {},
      },
      meta: {},
    };
  }

  const key = cacheKey(tenant ?? undefined, agreement.academic_year_id);
  const cached = PERIOD_CACHE.get(key);
  if (cached?.length) {
    return { success: true, data: cached, meta: { source: 'cache' } };
  }

  const bootstrapLine = readAgreementLineBootstrap(agreement);
  if (!bootstrapLine) {
    return {
      success: false,
      error: {
        code: 'agreement_line_required',
        message: 'Agreement lines are required to resolve billing periods.',
        details: {},
      },
      meta: {},
    };
  }

  await fetchOdooAcademicYearDates(agreement.academic_year_id, sessionId, tenant ?? undefined);

  const discovered = await discoverBillingPeriodsViaPreviewProbe({
    studentId: input.studentId,
    agreementId: input.agreementId,
    academicYearId: agreement.academic_year_id,
    line: bootstrapLine,
    sessionId,
    tenant: tenant ?? undefined,
  });

  if (!discovered.length) {
    return {
      success: false,
      error: {
        code: 'no_open_periods',
        message: 'No billing periods could be resolved for this agreement.',
        details: {},
      },
      meta: {},
    };
  }

  PERIOD_CACHE.set(key, discovered);
  return { success: true, data: discovered, meta: { source: 'preview_probe' } };
}

export function __clearAgreementAmendmentPeriodCacheForTests(): void {
  PERIOD_CACHE.clear();
}
