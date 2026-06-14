'use client';

import { useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useStudentHealth } from '../hooks/use-student-health';
import { useStudentOptions } from '../hooks/use-student-options';
import { StudentHealthEditDialog } from './student-health-edit-dialog';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

export function StudentHealthTab({
  studentId,
  canManage,
  onChanged,
}: {
  studentId: number;
  canManage: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const healthState = useStudentHealth(studentId, true);
  const optionsState = useStudentOptions();
  const [editOpen, setEditOpen] = useState(false);

  const bloodTypes = optionsState.options?.bloodTypes ?? [];
  const profile = healthState.data?.profile ?? null;
  const hasCriticalAlert = profile?.has_critical_alert === true;

  function bloodTypeLabel(value: string | null | undefined): string {
    if (!value) return t('common.dash');
    return bloodTypes.find((b) => b.value === value)?.label ?? value;
  }

  if (healthState.loading && !healthState.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (healthState.error) {
    if (healthState.error.code === 'student_health_forbidden' || healthState.error.code === 'forbidden') {
      return (
        <Card>
          <p className="tiny muted">{t('admin.student360.health.forbidden')}</p>
        </Card>
      );
    }
    return <ApiErrorView error={healthState.error} onRetry={healthState.reload} />;
  }

  return (
    <div className="student-health-tab">
      <SectionHead
        title={t('admin.student360.health.title')}
        action={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditOpen(true)}>
              {t('admin.student360.health.editProfile')}
            </button>
          ) : null
        }
      />

      {hasCriticalAlert ? (
        <div className="alert alert--danger student-health-alert" role="alert">
          {t('admin.student360.health.criticalAlert')}
        </div>
      ) : null}

      {!profile ? (
        <Card>
          <p className="tiny muted">{t('admin.student360.health.noProfile')}</p>
          {canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditOpen(true)}>
              {t('admin.student360.health.createProfile')}
            </button>
          ) : null}
        </Card>
      ) : (
        <div className="grid grid--cards student-health-grid">
          <Card>
            <SectionHead title={t('admin.student360.health.sections.basic')} />
            <DefinitionList
              items={[
                { label: t('admin.student360.health.bloodType'), value: bloodTypeLabel(profile.blood_type) },
                { label: t('admin.student360.health.allergies'), value: dash(t, profile.allergies) },
                {
                  label: t('admin.student360.health.chronicConditions'),
                  value: dash(t, profile.chronic_conditions),
                },
                {
                  label: t('admin.student360.health.regularMedications'),
                  value: dash(t, profile.regular_medications),
                },
                { label: t('admin.student360.health.specialNeeds'), value: dash(t, profile.special_needs) },
              ]}
            />
          </Card>

          <Card>
            <SectionHead title={t('admin.student360.health.sections.emergency')} />
            <DefinitionList
              items={[
                {
                  label: t('admin.student360.health.emergencyInstructions'),
                  value: dash(t, profile.health_emergency_instructions),
                },
                { label: t('admin.student360.health.doctorName'), value: dash(t, profile.doctor_name) },
                { label: t('admin.student360.health.doctorPhone'), value: dash(t, profile.doctor_phone) },
              ]}
            />
          </Card>

          <Card>
            <SectionHead title={t('admin.student360.health.sections.insurance')} />
            <DefinitionList
              items={[
                {
                  label: t('admin.student360.health.insuranceProvider'),
                  value: dash(t, profile.insurance_provider),
                },
                {
                  label: t('admin.student360.health.insuranceNumber'),
                  value: dash(t, profile.insurance_number),
                },
                {
                  label: t('admin.student360.health.insuranceExpiry'),
                  value: formatDate(profile.insurance_expiry_date) || t('common.dash'),
                },
              ]}
            />
          </Card>

          <Card>
            <SectionHead title={t('admin.student360.health.sections.notes')} />
            <p className="student-health-notes">{dash(t, profile.notes)}</p>
          </Card>
        </div>
      )}

      <StudentHealthEditDialog
        open={editOpen}
        studentId={studentId}
        profile={profile}
        bloodTypes={bloodTypes}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success(t('admin.student360.health.saveSuccess'));
          healthState.reload();
          onChanged();
        }}
      />
    </div>
  );
}
