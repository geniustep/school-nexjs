'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import {
  GuardianRelationshipForm,
  relationshipFormToUpdatePayload,
  relationshipToFormValues,
} from './guardian-relationship-form';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import type { GuardianRelationship } from '@/types/student-360';

export function GuardianEditDialog({
  open,
  studentId,
  relationship,
  onClose,
  onUpdated,
  successMessageKey = 'admin.student360.relationshipUpdated',
}: {
  open: boolean;
  studentId: number;
  relationship: GuardianRelationship | null;
  onClose: () => void;
  onUpdated: () => void;
  successMessageKey?: string;
}) {
  const t = useT();
  const toast = useToast();
  const [values, setValues] = useState(relationship ? relationshipToFormValues(relationship) : null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (relationship) setValues(relationshipToFormValues(relationship));
  }, [relationship]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!relationship || !values) return;
    setSaving(true);
    setFieldError(null);
    const payload = relationshipFormToUpdatePayload(values);
    const res = await api.post(
      endpoints.admin.studentGuardianUpdate(studentId, relationship.relationship_id),
      payload,
    );
    setSaving(false);

    if (res.success) {
      toast.success(t(successMessageKey));
      onClose();
      onUpdated();
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    setFieldError(mapped.message);
    toast.error(mapped.message);
  }

  if (!open || !relationship || !values) return null;

  return (
    <SetupDrawer open={open} title={t('admin.student360.editRelationship')} onClose={onClose}>
      <form className="col" style={{ gap: 16 }} onSubmit={submit}>
        <p className="tiny muted">{relationship.guardian.name}</p>
        <GuardianRelationshipForm values={values} onChange={setValues} fieldError={fieldError} />
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
