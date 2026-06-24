'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

export type SchoolBrandingSettingsData = {
  branding: LoginSchoolBrandingView;
  welcomeSubtitle: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  source: string;
  saveAvailable: boolean;
};

export type SchoolBrandingFieldErrors = {
  welcomeSubtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  form?: string;
};

export type SchoolBrandingSaveInput = {
  welcomeSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  logoBase64?: string | null;
  clearLogo?: boolean;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SchoolBrandingSettingsData };

export function useSchoolBrandingSettings() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const reload = useCallback(async (): Promise<SchoolBrandingSettingsData | null> => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/admin/school-branding', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const message =
          typeof body?.error?.message === 'string'
            ? body.error.message
            : res.status === 403
              ? 'forbidden'
              : 'load_failed';
        setState({ status: 'error', message });
        return null;
      }
      const data = body.data as SchoolBrandingSettingsData;
      setState({ status: 'ready', data });
      return data;
    } catch {
      setState({ status: 'error', message: 'network_error' });
      return null;
    }
  }, []);

  const save = useCallback(
    async (
      input: SchoolBrandingSaveInput,
    ): Promise<
      | { ok: true; data: SchoolBrandingSettingsData }
      | { ok: false; message: string; fieldErrors?: SchoolBrandingFieldErrors }
    > => {
      try {
        const res = await fetch('/api/admin/school-branding', {
          method: 'PUT',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            welcomeSubtitle: input.welcomeSubtitle,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            logoBase64: input.logoBase64,
            clearLogo: input.clearLogo,
          }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          const field = body?.error?.details?.field;
          const fieldErrors: SchoolBrandingFieldErrors = {};
          if (field === 'welcome_subtitle') fieldErrors.welcomeSubtitle = 'validation';
          if (field === 'primary_color') fieldErrors.primaryColor = 'validation';
          if (field === 'secondary_color') fieldErrors.secondaryColor = 'validation';
          if (field === 'logo') fieldErrors.logo = 'validation';
          return {
            ok: false,
            message:
              res.status === 403
                ? 'forbidden'
                : res.status === 503 && body?.error?.code === 'save_contract_unavailable'
                  ? 'save_contract_unavailable'
                  : typeof body?.error?.message === 'string'
                    ? body.error.message
                    : 'save_failed',
            fieldErrors,
          };
        }
        const data = body.data as SchoolBrandingSettingsData;
        setState({ status: 'ready', data });
        return { ok: true, data };
      } catch {
        return { ok: false, message: 'network_error' };
      }
    },
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload, save };
}
