'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { GuardianRelationshipCard } from './guardian-relationship-card';
import { GuardianAddDialog } from './guardian-add-dialog';
import { GuardianEditDialog } from './guardian-edit-dialog';
import { GuardianRemoveDialog } from './guardian-remove-dialog';
import { Student360CompactEmpty } from './student-360-compact-empty';
import { StudentCoGuardianStudentsPanel } from './student-co-guardian-students-panel';
import { isRelationshipActive } from '../utils/relationship-types';
import { studentClassLabel } from '../utils/student-academic-labels';
import {
  findDuplicateStrongRelationshipTypes,
  duplicateRelationshipMessage,
} from '../utils/guardian-duplicate-relationship-alert';
import {
  isDefaultBillingGuardian,
  resolveDefaultBillingGuardian,
} from '../utils/resolve-default-billing-guardian';
import type {
  GuardianRelationship,
  GuardianSummary,
  LinkPersonAsGuardianResponse,
  StudentDetailsData,
} from '@/types/student-360';
import { getStudentDisplayName } from '@/lib/utils/student';

function mergeGuardianRoleHint(
  guardian: GuardianSummary,
  hint?: Partial<GuardianSummary>,
): GuardianSummary {
  if (!hint) return guardian;
  return {
    ...guardian,
    existing_roles: hint.existing_roles ?? guardian.existing_roles,
    role_labels: hint.role_labels ?? guardian.role_labels,
    teacher_id: hint.teacher_id ?? guardian.teacher_id,
    staff_id: hint.staff_id ?? guardian.staff_id,
    guardian_id: hint.guardian_id ?? guardian.guardian_id,
    user_id: hint.user_id ?? guardian.user_id,
    has_user: hint.has_user ?? guardian.has_user,
    has_user_account: hint.has_user_account ?? guardian.has_user_account,
    has_account: hint.has_account ?? guardian.has_account,
  };
}

function roleHintFromLinkResult(result: LinkPersonAsGuardianResponse): Partial<GuardianSummary> | null {
  const roles = result.person?.existing_roles ?? result.guardian.existing_roles;
  const labels = result.person?.role_labels ?? result.guardian.role_labels;
  if (!roles?.length && !labels?.length) return null;

  return {
    existing_roles: roles,
    role_labels: labels,
    teacher_id: result.person?.teacher_id ?? result.guardian.teacher_id,
    staff_id: result.person?.staff_id ?? result.guardian.staff_id,
    guardian_id: result.person?.guardian_id ?? result.guardian.guardian_id,
    user_id: result.person?.user_id ?? result.guardian.user_id,
    has_user: result.person?.has_user ?? result.guardian.has_user,
    has_user_account:
      result.person?.has_user_account ??
      result.account?.has_user_account ??
      result.guardian.has_user_account,
    has_account:
      result.person?.has_user_account ??
      result.account?.has_user_account ??
      result.guardian.has_account,
  };
}

export function StudentGuardiansTab({
  details,
  canManageGuardians,
  onChanged,
}: {
  details: StudentDetailsData;
  canManageGuardians: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const studentId = details.student.id;
  const [addOpen, setAddOpen] = useState(false);
  const [editRel, setEditRel] = useState<GuardianRelationship | null>(null);
  const [removeRel, setRemoveRel] = useState<GuardianRelationship | null>(null);
  const [guardianRoleHints, setGuardianRoleHints] = useState<Record<number, Partial<GuardianSummary>>>({});

  const relationshipsWithRoleHints = useMemo(
    () =>
      details.guardian_relationships.map((rel) => {
        const hint = guardianRoleHints[rel.guardian.id];
        if (!hint) return rel;
        return { ...rel, guardian: mergeGuardianRoleHint(rel.guardian, hint) };
      }),
    [details.guardian_relationships, guardianRoleHints],
  );

  const active = relationshipsWithRoleHints.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const ended = relationshipsWithRoleHints.filter(
    (r) => !isRelationshipActive(r.state, r.active),
  );

  function handleGuardianLinked(result?: LinkPersonAsGuardianResponse) {
    if (result?.guardian?.id) {
      const hint = roleHintFromLinkResult(result);
      if (hint) {
        setGuardianRoleHints((prev) => ({
          ...prev,
          [result.guardian.id]: { ...prev[result.guardian.id], ...hint },
        }));
      }
    }
    onChanged();
  }

  function copyPhone(phone: string) {
    void navigator.clipboard.writeText(phone).then(() => {
      toast.success(t('admin.student360.guardiansCopiedPhone'));
    });
  }

  const duplicateAlerts = findDuplicateStrongRelationshipTypes(relationshipsWithRoleHints);
  const duplicateMessage = duplicateRelationshipMessage(t, duplicateAlerts);
  const billingResolution = resolveDefaultBillingGuardian(relationshipsWithRoleHints);

  const sortedActive = [...active].sort((a, b) => {
    if (a.is_primary_contact !== b.is_primary_contact) return a.is_primary_contact ? -1 : 1;
    const aBilling = isDefaultBillingGuardian(a.guardian.id, billingResolution);
    const bBilling = isDefaultBillingGuardian(b.guardian.id, billingResolution);
    if (aBilling !== bBilling) return aBilling ? -1 : 1;
    return a.guardian.name.localeCompare(b.guardian.name, undefined, { sensitivity: 'base' });
  });

  return (
    <div className="student-360-tab-panel student-360-guardians-tab">
      <header className="student-360-guardians-toolbar">
        <div className="student-360-guardians-toolbar__main">
          <div className="student-360-guardians-toolbar__title-row">
            <h2 className="student-360-guardians-toolbar__title">{t('admin.student360.guardiansTitle')}</h2>
            {active.length > 0 ? (
              <span className="student-360-guardians-toolbar__stat">
                {t('admin.student360.guardiansActiveCount', { count: active.length })}
              </span>
            ) : null}
          </div>
          <p className="student-360-guardians-toolbar__desc">{t('admin.student360.pages.guardians.description')}</p>
        </div>
        {canManageGuardians ? (
          <div className="student-360-guardians-toolbar__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
              {t('admin.student360.addGuardian')}
            </button>
          </div>
        ) : null}
      </header>

      {duplicateMessage ? (
        <div className="student-360-guardians-alert" role="status">
          <div className="student-360-guardians-alert__content">
            <span className="student-360-guardians-alert__icon" aria-hidden="true">!</span>
            <p>{duplicateMessage}</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => sortedActive[1] && setEditRel(sortedActive[1])}>
            {t('admin.student360.guardiansReviewRelationships')}
          </button>
        </div>
      ) : null}

      {active.length === 0 && ended.length === 0 ? (
        <Student360CompactEmpty
          className="student-360-compact-empty--guardians"
          title={t('admin.student360.noGuardiansTitle')}
          description={t('admin.student360.guardiansEmptyDesc')}
          action={
            canManageGuardians ? (
              <>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
                  {t('admin.student360.addGuardian')}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddOpen(true)}>
                  {t('admin.student360.searchExisting')}
                </button>
              </>
            ) : undefined
          }
        />
      ) : (
        <div className="student-360-guardians-tab__body">
          <div className="student-360-guardians-grid">
            {sortedActive.map((rel) => (
              <GuardianRelationshipCard
                key={rel.relationship_id}
                rel={rel}
                canManage={canManageGuardians}
                isDefaultBilling={isDefaultBillingGuardian(rel.guardian.id, billingResolution)}
                onEdit={() => setEditRel(rel)}
                onRemove={() => setRemoveRel(rel)}
                onCopyPhone={copyPhone}
                onAccountChanged={onChanged}
              />
            ))}
          </div>
          {ended.length > 0 ? (
            <section className="student-360-guardians-ended">
              <header className="student-360-guardians-ended__head">
                <h3 className="student-360-guardians-ended__title">{t('admin.student360.endedRelationships')}</h3>
                <span className="student-360-guardians-ended__count">{ended.length}</span>
              </header>
              <div className="student-360-guardians-grid student-360-guardians-grid--ended">
                {ended.map((rel) => (
                  <GuardianRelationshipCard
                    key={rel.relationship_id}
                    rel={rel}
                    canManage={false}
                    onEdit={() => {}}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <StudentCoGuardianStudentsPanel studentId={studentId} />

      <GuardianAddDialog
        open={addOpen}
        studentId={studentId}
        relationships={relationshipsWithRoleHints}
        onClose={() => setAddOpen(false)}
        onLinked={handleGuardianLinked}
      />
      <GuardianEditDialog
        open={!!editRel}
        studentId={studentId}
        relationship={editRel}
        studentName={getStudentDisplayName(details.student)}
        studentClassName={studentClassLabel(details.student.class)}
        currentPrimaryName={
          sortedActive.find((r) => r.is_primary_contact && r.relationship_id !== editRel?.relationship_id)
            ?.guardian.name ?? null
        }
        onClose={() => setEditRel(null)}
        onUpdated={onChanged}
      />
      <GuardianRemoveDialog
        open={!!removeRel}
        studentId={studentId}
        relationship={removeRel}
        onClose={() => setRemoveRel(null)}
        onRemoved={onChanged}
      />
    </div>
  );
}
