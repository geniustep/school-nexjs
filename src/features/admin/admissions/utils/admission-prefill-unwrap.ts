import type { AdmissionPrefill, AdmissionPrefillApiEnvelope } from '@/types/admission';

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function unwrapAdmissionPrefill(raw: AdmissionPrefillApiEnvelope | AdmissionPrefill | null | undefined): AdmissionPrefill {
  if (!raw || typeof raw !== 'object') return {};

  const envelope = raw as AdmissionPrefillApiEnvelope;
  const inner = (envelope.prefill ?? raw) as AdmissionPrefill;
  if (!inner || typeof inner !== 'object') return {};

  const readiness =
    inner.readiness && typeof inner.readiness === 'object'
      ? (inner.readiness as Record<string, unknown>)
      : null;

  return {
    source: inner.source ?? null,
    student: inner.student ?? null,
    guardian: inner.guardian ?? null,
    academic: inner.academic ?? null,
    admission: inner.admission ?? null,
    readiness,
    warnings: asStringList(inner.warnings).length
      ? asStringList(inner.warnings)
      : asStringList(readiness?.warnings),
    blocking_issues: asStringList(inner.blocking_issues).length
      ? asStringList(inner.blocking_issues)
      : asStringList(readiness?.blocking_issues),
  };
}
