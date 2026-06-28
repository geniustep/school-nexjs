'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFinanceRepairDiagnostics } from '../api/finance-admin-api';
import {
  normalizeFinanceRepairDiagnostics,
} from '../utils/normalize-finance-repair-diagnostics';
import type { NormalizedFinanceRepairDiagnostics } from '../types/finance-repair';
import type { ApiErrorBody } from '@/types/api';

export interface FinanceRepairDiagnosticsState {
  loading: boolean;
  initialLoading: boolean;
  diagnostics: NormalizedFinanceRepairDiagnostics | null;
  /** True only for genuine load failures (not a missing/unavailable contract). */
  error: ApiErrorBody | null;
  /** True when the backend route is unavailable (e.g. not_found) — card hides silently. */
  unavailable: boolean;
  reload: () => void;
}

/**
 * Loads and normalizes the student finance repair diagnostics.
 * When the backend contract is not deployed (not_found / 404), the hook reports
 * `unavailable` so the UI can hide the Repair Center silently rather than show a
 * technical error.
 */
export function useFinanceRepairDiagnostics(
  studentId: number,
  enabled: boolean,
  refreshSignal = 0,
): FinanceRepairDiagnosticsState {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<NormalizedFinanceRepairDiagnostics | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !studentId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchFinanceRepairDiagnostics(studentId).then((res) => {
      if (!active) return;
      if (res.success) {
        setDiagnostics(normalizeFinanceRepairDiagnostics(res.data));
        setError(null);
        setUnavailable(false);
      } else {
        const code = res.error.code;
        const status = (res.error.details as { status?: number } | undefined)?.status;
        // Treat a missing contract as "unavailable" (hide), not an error to surface.
        if (code === 'not_found' || status === 404) {
          setUnavailable(true);
          setError(null);
        } else {
          setError(res.error);
        }
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [studentId, enabled, nonce, refreshSignal]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return useMemo(
    () => ({
      loading,
      initialLoading: loading && diagnostics === null,
      diagnostics,
      error,
      unavailable,
      reload,
    }),
    [loading, diagnostics, error, unavailable, reload],
  );
}
