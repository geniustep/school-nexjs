'use client';

import { useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { formatRoleLabels } from '@/features/admin/students/utils/person-role-presentation';
import { studentClassLabel } from '@/features/admin/students/utils/student-academic-labels';
import { linkExistingPersonAsGuardian } from '@/features/admin/students/utils/guardian-link-person';
import { mapGuardianApiError } from '@/features/admin/students/utils/guardian-api-errors';
import { getStudentDisplayName } from '@/lib/utils/student';
import {
  DEFAULT_RELATIONSHIP_FORM,
  GuardianRelationshipForm,
  relationshipFormToLinkPersonPayload,
  type RelationshipFormValues,
} from '@/features/admin/students/components/guardian-relationship-form';
import { GuardianRelationshipImpactAlert } from '@/features/admin/students/components/guardian-relationship-impact-alert';
import { ParentStudentSearchPanel } from './parent-student-search-panel';
import type { Parent } from '@/types/parent';
import type { Student } from '@/types/student';
import '@/features/admin/students/components/guardian-flow.css';

type Step = 'search' | 'relationship' | 'already_linked';

function resolvePartnerId(parent: Parent): number | null {
  if (typeof parent.partner_id === 'number') return parent.partner_id;
  if (typeof parent.person_id === 'number') return parent.person_id;
  return null;
}

export function ParentLinkStudentDialog({
  open,
  parent,
  linkedStudentIds,
  onClose,
  onLinked,
}: {
  open: boolean;
  parent: Parent;
  linkedStudentIds: Set<number>;
  onClose: () => void;
  onLinked: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [step, setStep] = useState<Step>('search');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formValues, setFormValues] = useState<RelationshipFormValues>(DEFAULT_RELATIONSHIP_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const roleLine = formatRoleLabels(parent.role_labels);
  const hasAccount =
    parent.account?.has_user_account === true ||
    !!(parent.has_user_account ?? parent.has_account);
  const partnerId = resolvePartnerId(parent);

  const drawerTitle = useMemo(() => {
    if (step === 'relationship' && selectedStudent) {
      return t('admin.parentProfile.linkStudentDrawerTitle', {
        name: parent.display_name ?? parent.name,
      });
    }
    return t('admin.parentProfile.linkStudentDrawerTitle', {
      name: parent.display_name ?? parent.name,
    });
  }, [parent.display_name, parent.name, selectedStudent, step, t]);

  function reset() {
    setStep('search');
    setSelectedStudent(null);
    setFormValues(DEFAULT_RELATIONSHIP_FORM);
    setFieldError(null);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleStudentSelected(student: Student) {
    setSelectedStudent(student);
    setFormValues(DEFAULT_RELATIONSHIP_FORM);
    setFieldError(null);
    setStep('relationship');
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || partnerId == null) {
      setFieldError(t('errors.validationFailed'));
      return;
    }

    setSaving(true);
    setFieldError(null);

    const payload = relationshipFormToLinkPersonPayload({ partner_id: partnerId }, formValues);
    const res = await linkExistingPersonAsGuardian(selectedStudent.id, payload);
    setSaving(false);

    if (res.success) {
      const multiRole = (parent.role_labels?.length ?? 0) > 1 || !!parent.teacher_id;
      toast.success(
        multiRole
          ? t('admin.parentProfile.linkStudentMultiRoleSuccess')
          : t('admin.parentProfile.linkStudentSuccess'),
      );
      handleClose();
      onLinked();
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    const code = String(res.error?.code ?? '');
    if (code === 'guardian_relation_already_exists' || code === 'guardian_already_linked') {
      setFieldError(t('admin.parentProfile.studentAlreadyLinked'));
      setStep('already_linked');
      return;
    }

    setFieldError(mapped.message);
    toast.error(mapped.message);
  }

  if (!open) return null;

  return (
    <SetupDrawer open={open} title={drawerTitle} onClose={handleClose}>
      {step === 'search' ? (
        <div className="guardian-flow-drawer__body">
          <p className="tiny muted">{t('admin.parentProfile.linkStudentDrawerDesc')}</p>
          {hasAccount ? (
            <div className="guardian-account-reuse-note" role="status">
              <p>{t('admin.parentProfile.currentAccountForRoles')}</p>
            </div>
          ) : null}
          <ParentStudentSearchPanel
            linkedStudentIds={linkedStudentIds}
            onSelect={handleStudentSelected}
          />
        </div>
      ) : null}

      {step === 'relationship' && selectedStudent ? (
        <form className="guardian-flow-drawer__body guardian-flow-drawer__form" onSubmit={submitLink}>
          <div className="guardian-selected-summary">
            <p className="tiny muted">{t('admin.parentProfile.linkSummaryStudent')}</p>
            <strong dir="auto">{getStudentDisplayName(selectedStudent)}</strong>
            <p className="tiny muted">
              {t('admin.parentProfile.linkSummaryClass')}: {studentClassLabel(selectedStudent.class)}
            </p>
            <p className="tiny muted">
              {t('admin.parentProfile.linkSummaryParent')}: {parent.display_name ?? parent.name}
            </p>
            {roleLine ? (
              <p className="tiny muted">
                {t('admin.parentProfile.currentRoles')}: {roleLine}
              </p>
            ) : null}
          </div>

          {hasAccount ? (
            <div className="guardian-account-reuse-note" role="status">
              <p>{t('admin.parentProfile.currentAccountForRoles')}</p>
            </div>
          ) : null}

          <GuardianRelationshipImpactAlert
            values={formValues}
            personContact={{
              phone: parent.phone,
              mobile: parent.mobile,
              email: parent.email,
            }}
            parentProfileHref={`/admin/parents/${parent.id}?edit=1`}
          />

          <GuardianRelationshipForm values={formValues} onChange={setFormValues} fieldError={fieldError} />

          <div className="guardian-flow-drawer__actions">
            <button type="submit" className="btn btn--primary" disabled={saving || partnerId == null}>
              {saving ? t('admin.student360.linkingPersonProgress') : t('admin.parentProfile.linkStudentToParent')}
            </button>
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => setStep('search')}>
              {t('common.back')}
            </button>
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={handleClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {step === 'already_linked' && selectedStudent ? (
        <div className="guardian-flow-drawer__body">
          <p>{t('admin.parentProfile.studentAlreadyLinked')}</p>
          <div className="guardian-selected-summary">
            <strong dir="auto">{getStudentDisplayName(selectedStudent)}</strong>
          </div>
          <button type="button" className="btn btn--ghost" onClick={handleClose}>
            {t('common.close')}
          </button>
        </div>
      ) : null}
    </SetupDrawer>
  );
}
