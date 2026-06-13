'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { GuardianRelationshipCard } from './guardian-relationship-card';
import { GuardianAddDialog } from './guardian-add-dialog';
import { GuardianEditDialog } from './guardian-edit-dialog';
import { GuardianEndDialog } from './guardian-end-dialog';
import { isRelationshipActive } from '../utils/relationship-types';
import type { GuardianRelationship, StudentDetailsData } from '@/types/student-360';

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
  const studentId = details.student.id;
  const [addOpen, setAddOpen] = useState(false);
  const [editRel, setEditRel] = useState<GuardianRelationship | null>(null);
  const [endRel, setEndRel] = useState<GuardianRelationship | null>(null);

  const active = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const ended = details.guardian_relationships.filter(
    (r) => !isRelationshipActive(r.state, r.active),
  );

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <SectionHead title={t('admin.student360.guardiansTitle')} />
        {canManageGuardians && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddOpen(true)}>
            {t('admin.student360.addGuardian')}
          </button>
        )}
      </div>

      {active.length === 0 && ended.length === 0 ? (
        <EmptyState
          title={t('admin.student360.noGuardiansTitle')}
          description={t('admin.student360.noGuardiansDesc')}
        />
      ) : (
        <>
          <div className="grid grid--cards">
            {active.map((rel) => (
              <GuardianRelationshipCard
                key={rel.relationship_id}
                rel={rel}
                canManage={canManageGuardians}
                onEdit={() => setEditRel(rel)}
                onEnd={() => setEndRel(rel)}
              />
            ))}
          </div>
          {ended.length > 0 && (
            <div className="col" style={{ gap: 12 }}>
              <SectionHead title={t('admin.student360.endedRelationships')} />
              <div className="grid grid--cards">
                {ended.map((rel) => (
                  <GuardianRelationshipCard
                    key={rel.relationship_id}
                    rel={rel}
                    canManage={false}
                    onEdit={() => {}}
                    onEnd={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <GuardianAddDialog
        open={addOpen}
        studentId={studentId}
        onClose={() => setAddOpen(false)}
        onLinked={onChanged}
      />
      <GuardianEditDialog
        open={!!editRel}
        studentId={studentId}
        relationship={editRel}
        onClose={() => setEditRel(null)}
        onUpdated={onChanged}
      />
      <GuardianEndDialog
        open={!!endRel}
        studentId={studentId}
        relationship={endRel}
        onClose={() => setEndRel(null)}
        onEnded={onChanged}
      />
    </div>
  );
}
