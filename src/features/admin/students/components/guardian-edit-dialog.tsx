'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { studentClassLabel } from '@/features/admin/students/utils/student-academic-labels';
import {
  GuardianRelationshipForm,
  relationshipFormToUpdatePayload,
  relationshipToFormValues,
} from './guardian-relationship-form';
import { GuardianRelationshipImpactAlert } from './guardian-relationship-impact-alert';
import { mapGuardianApiError } from '../utils/guardian-api-errors';
import type { GuardianRelationship } from '@/types/student-360';
import '@/features/admin/students/components/guardian-flow.css';

export function GuardianEditDialog({
  open,
  studentId,
  relationship,
  studentName,
  studentClassName,
  currentPrimaryName,
  personContact,
  onClose,
  onUpdated,
  successMessageKey = 'admin.student360.relationshipUpdated',
}: {
  open: boolean;
  studentId: number;
  relationship: GuardianRelationship | null;
  studentName?: string | null;
  studentClassName?: string | null;
  currentPrimaryName?: string | null;
  personContact?: {
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
  };
  onClose: () => void;
  onUpdated: () => void;
  successMessageKey?: string;
}) {
  const t = useT();
  const toast = useToast();
  const [values, setValues] = useState(relationship ? relationshipToFormValues(relationship) : null);
  const [initialValues, setInitialValues] = useState(relationship ? relationshipToFormValues(relationship) : null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (relationship) {
      const next = relationshipToFormValues(relationship);
      setValues(next);
      setInitialValues(next);
    }
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

  if (!open || !relationship || !values || !initialValues) return null;

  const guardianName = relationship.guardian.name;
  const resolvedStudentName = studentName ?? t('admin.student360.breadcrumb.fallbackName');
  const roleLine = formatRoleLabels(
    relationship.guardian.role_labels ?? relationship.guardian.existing_roles,
  );
  const title = t('admin.parentProfile.editRelationshipTitle', {
    guardian: guardianName,
    student: resolvedStudentName,
  });

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      <form className="guardian-flow-drawer__body guardian-flow-drawer__form" onSubmit={submit}>
        <div className="guardian-selected-summary">
          {roleLine ? (
            <p className="tiny muted">
              {guardianName}: {roleLine}
            </p>
          ) : null}
          {studentClassName ? (
            <p className="tiny muted">
              {resolvedStudentName}: {studentClassName}
            </p>
          ) : (
            <p className="tiny muted">{resolvedStudentName}</p>
          )}
        </div>

        <GuardianRelationshipImpactAlert
          values={values}
          initialValues={initialValues}
          personContact={
            personContact ?? {
              phone: relationship.guardian.phone,
              email: relationship.guardian.email,
            }
          }
          currentPrimaryName={currentPrimaryName}
          parentProfileHref={`/admin/parents/${relationship.guardian.id}`}
        />

        <GuardianRelationshipForm values={values} onChange={setValues} fieldError={fieldError} />

        <div className="guardian-flow-drawer__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? t('admin.parentProfile.savingChanges') : t('admin.parentProfile.saveChanges')}
          </button>
          <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
