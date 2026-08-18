'use client';

import { EmptyState } from '@/components/states/states';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { StaffWarningsPanel } from '@/features/admin/staff/components/staff-warnings-panel';
import {
  filterDisplayPermissionCodes,
  resolveStaffPermissionLabel,
  resolveStaffRoleDisplayLabel,
  resolvePermissionsModeLabel,
  resolveStaffRoleTemplateChipLabel,
  resolveStaffScopeRoleTemplateLabel,
} from '@/features/admin/staff/utils/staff-center-present';
import {
  resolveStoredCapabilityCodes,
  scopeStoredCapabilityCodes,
} from '@/features/admin/staff/utils/staff-permission-merge';
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import { isStaffCenterParent } from '@/features/admin/staff/utils/normalize-staff-center';
import { useStaffResponsibilityPermissionExplanation } from '@/features/admin/staff/hooks/use-staff-responsibility-assignments';
import { STAFF_RESPONSIBILITY_COPY } from '@/features/admin/staff/utils/staff-responsibility-copy';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type {
  StaffResponsibilityAssignmentSource,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';
import type { StaffEffectivePermissionsPayload, StaffMember } from '@/types/academic-setup';

function LabeledCapabilityList({
  items,
  emptyLabel,
}: {
  items?: string[];
  emptyLabel: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const codes = filterDisplayPermissionCodes(items);
  if (!codes.length) return <span className="muted">{emptyLabel}</span>;

  return (
    <div className="staff-center-chip-list">
      {codes.map((code) => {
        const label = resolveStaffPermissionLabel(code, locale, t) ?? code;
        return (
          <Badge key={code} tone="blue">
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

function sourceScopeLabel(
  source: StaffResponsibilityAssignmentSource,
  copy: (typeof STAFF_RESPONSIBILITY_COPY)['ar'],
): string {
  if (source.scope_type === 'school') return copy.scopeSchool;
  if (source.scope_type === 'cycle') {
    return `${copy.scopeCycle}: ${copy.selectedCount(source.cycle_ids?.length ?? 0)}`;
  }
  if (source.scope_type === 'levels') {
    return `${copy.scopeLevels}: ${copy.selectedCount(source.level_ids?.length ?? 0)}`;
  }
  if (source.scope_type === 'classes') {
    return `${copy.scopeClasses}: ${copy.selectedCount(source.class_ids?.length ?? 0)}`;
  }
  return copy.unknownScope;
}

function StaffResponsibilityPermissionSources({ userId }: { userId: number }) {
  const t = useT();
  const { locale } = useLocale();
  const copy = STAFF_RESPONSIBILITY_COPY[locale];
  const explanation = useStaffResponsibilityPermissionExplanation(userId);
  const capabilities = explanation.payload?.capabilities ?? [];
  const explained = capabilities.filter((capability) => (capability.assignment_sources ?? []).length > 0);

  if (explanation.loading && !explanation.payload) {
    return <p className="muted">{copy.loading}</p>;
  }
  if (explanation.error || !explained.length) {
    return null;
  }

  return (
    <div style={{ marginTop: 14 }} data-testid="staff-effective-permission-sources">
      <SectionHead title={copy.sourceTitle} />
      <p className="muted" style={{ marginTop: 0 }}>{copy.sourceDescription}</p>
      <div className="col" style={{ gap: 10 }}>
        {explained.map((capability) => {
          const capabilityLabel =
            resolveStaffPermissionLabel(capability.code, locale, t) ?? capability.label ?? capability.code;
          return (
            <article
              key={capability.code}
              style={{ border: '1px solid var(--c-border)', borderRadius: 10, padding: 10 }}
            >
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <Badge tone="blue">{capabilityLabel}</Badge>
              </div>
              <div className="col" style={{ gap: 7 }}>
                {(capability.assignment_sources ?? []).map((source) => (
                  <div
                    key={source.assignment_id}
                    data-testid={`permission-source-${capability.code}-${source.assignment_id}`}
                    style={{ display: 'grid', gap: 3 }}
                  >
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone={source.origin === 'manual' ? 'blue' : 'slate'}>
                        {source.origin === 'manual' ? copy.manual : copy.legacy}
                      </Badge>
                      <span>{sourceScopeLabel(source, copy)}</span>
                    </div>
                    <div className="tiny muted">
                      {copy.yearPolicy}:{' '}
                      {source.year_policy === 'bound'
                        ? copy.yearBound
                        : source.year_policy === 'unbounded'
                          ? copy.yearUnbounded
                          : copy.yearFollowsContext}
                    </div>
                    <div className="tiny muted">
                      {copy.dates}: {copy.from} {source.effective_from ?? '—'} · {copy.to}{' '}
                      {source.effective_to ?? copy.openEnded}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StaffPermissionsSection({
  member,
  payload,
}: {
  member: StaffMember;
  payload?: StaffEffectivePermissionsPayload | null;
}) {
  const t = useT();

  const storedCodes = resolveStoredCapabilityCodes(member, payload);
  const assigned = storedCodes.length
    ? storedCodes
    : payload?.assigned_capabilities ?? member.assigned_capabilities ?? member.capabilities;
  const effectiveCaps = payload?.effective_capabilities ?? member.effective_capabilities;
  const effectivePerms = payload?.effective_permissions ?? member.effective_permissions ?? member.permissions;
  const permissionWarnings = payload?.warnings ?? member.warnings;
  const roleLabel = resolveStaffRoleDisplayLabel(member, t);
  const userId = member.user_id ?? member.id;

  return (
    <Card className="staff-center-section">
      <SectionHead title={t('admin.staffCenter.effectivePermissionsTitle')} />
      <StaffWarningsPanel warnings={permissionWarnings} />
      <DefinitionList
        items={[
          {
            label: t('admin.staffCenter.roleType'),
            value: roleLabel,
          },
          {
            label: t('admin.staffCenter.adminKind'),
            value:
              isStaffCenterParent(member) || !member.admin_kind
                ? t('common.dash')
                : resolveStaffAdminKindLabel(member.admin_kind, t),
          },
          {
            label: t('admin.staffCenter.permissionsMode'),
            value: resolvePermissionsModeLabel(
              payload?.permissions_mode ?? member.permissions_mode,
              t,
            ),
          },
          {
            label: t('admin.staffCenter.assignedCapabilities'),
            value: (
              <LabeledCapabilityList
                items={assigned}
                emptyLabel={t('admin.staffCenter.noAssignedCapabilities')}
              />
            ),
          },
          {
            label: t('admin.staffCenter.effectiveCapabilities'),
            value: (
              <LabeledCapabilityList
                items={effectiveCaps}
                emptyLabel={t('admin.staffCenter.noEffectiveCapabilities')}
              />
            ),
          },
          {
            label: t('admin.staffCenter.effectivePermissions'),
            value: (
              <LabeledCapabilityList
                items={effectivePerms}
                emptyLabel={t('admin.staffCenter.noEffectivePermissions')}
              />
            ),
          },
        ]}
      />
      <StaffResponsibilityPermissionSources userId={userId} />
    </Card>
  );
}

export function StaffScopesSection({ member }: { member: StaffMember }) {
  const t = useT();
  const { locale } = useLocale();
  const scopes = member.scopes ?? [];

  return (
    <Card className="staff-center-section">
      <SectionHead title={t('admin.staffCenter.scopesTitle')} />
      {!scopes.length ? (
        <EmptyState title={t('admin.staffCenter.noScopes')} />
      ) : (
        <div className="staff-center-scopes">
          {scopes.map((scope, index) => (
            <article key={index} className="staff-center-scope-card">
              <DefinitionList
                items={[
                  {
                    label: t('admin.staffCenter.roleTemplate'),
                    value: resolveStaffScopeRoleTemplateLabel(scope, member, t),
                  },
                  {
                    label: t('admin.staffCenter.school'),
                    value: scope.school_id != null ? String(scope.school_id) : t('common.dash'),
                  },
                  {
                    label: t('admin.staffCenter.levels'),
                    value: scope.level_ids?.length ? scope.level_ids.join(', ') : t('common.dash'),
                  },
                  {
                    label: t('nav.classes'),
                    value: scope.class_ids?.length ? scope.class_ids.join(', ') : t('common.dash'),
                  },
                  {
                    label: t('admin.staffCenter.capabilities'),
                    value: (
                      <LabeledCapabilityList
                        items={scopeStoredCapabilityCodes(scope)}
                        emptyLabel={t('admin.staffCenter.noCapabilitiesInScope')}
                      />
                    ),
                  },
                ]}
              />
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}

export function StaffRoleTemplatesSection({ member }: { member: StaffMember }) {
  const t = useT();
  const templates = member.role_templates ?? [];
  const roleLabel = resolveStaffRoleDisplayLabel(member, t);

  if (!templates.length && !member.creation_template_code) {
    return roleLabel !== t('common.dash') ? (
      <Card className="staff-center-section">
        <SectionHead title={t('admin.staffCenter.roleTemplatesTitle')} />
        <Badge tone="slate">{roleLabel}</Badge>
      </Card>
    ) : null;
  }

  return (
    <Card className="staff-center-section">
      <SectionHead title={t('admin.staffCenter.roleTemplatesTitle')} />
      <div className="staff-center-chip-list">
        {roleLabel !== t('common.dash') ? (
          <Badge tone="blue">{roleLabel}</Badge>
        ) : null}
        {templates.map((template, index) => {
          const raw =
            typeof template === 'string'
              ? template
              : template.label ?? template.admin_kind ?? String(index);
          const label = resolveStaffRoleTemplateChipLabel(raw, member, t);
          return (
            <Badge key={`${raw}-${index}`} tone="slate">
              {label}
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}
