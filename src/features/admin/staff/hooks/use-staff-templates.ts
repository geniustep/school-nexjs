'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import {
  fetchStaffCreationTemplates,
  previewStaffCreationTemplate,
} from '@/features/admin/staff/api/staff-templates-api';
import type { StaffCreationTemplate, StaffTemplatePreview, StaffTemplatePreviewPayload } from '@/types/staff-templates';
import type { ApiErrorBody } from '@/types/api';

export function useStaffCreationTemplates() {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<StaffCreationTemplate[]>([]);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
    fetchStaffCreationTemplates(query).then((res) => {
      if (!active) return;
      if (res.ok) {
        setTemplates(res.templates);
        setError(null);
      } else {
        setTemplates([]);
        setError(res.error);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [activeSchoolId, nonce]);

  return { templates, loading, error, reload };
}

export function useStaffTemplatePreview() {
  const { activeSchoolId } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<StaffTemplatePreview | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const loadPreview = useCallback(
    async (payload: StaffTemplatePreviewPayload) => {
      setLoading(true);
      setError(null);
      const query = activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
      const res = await previewStaffCreationTemplate(payload, query);
      if (res.ok) {
        setPreview(res.preview);
        setError(null);
      } else {
        setPreview(null);
        setError(res.error);
      }
      setLoading(false);
      return res;
    },
    [activeSchoolId],
  );

  const resetPreview = useCallback(() => {
    setPreview(null);
    setError(null);
    setLoading(false);
  }, []);

  return { preview, loading, error, loadPreview, resetPreview };
}
