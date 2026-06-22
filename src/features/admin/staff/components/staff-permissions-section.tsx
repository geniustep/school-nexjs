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
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import { useLocale, useT } from '@/features/i18n/locale-context';
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

export function StaffPermissionsSection({
  member,
  payload,
}: {
  member: StaffMember;
  payload?: StaffEffectivePermissionsPayload | null;
}) {
  const t = useT();

  const assigned = payload?.assigned_capabilities ?? member.assigned_capabilities ?? member.capabilities;
  const effectiveCaps = payload?.effective_capabilities ?? member.effective_capabilities;
  const effectivePerms = payload?.effective_permissions ?? member.effective_permissions ?? member.permissions;
  const permissionWarnings = payload?.warnings ?? member.warnings;
  const roleLabel = resolveStaffRoleDisplayLabel(member, t);

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
            value: member.admin_kind
              ? resolveStaffAdminKindLabel(member.admin_kind, t)
              : t('common.dash'),
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
                        items={scope.capabilities}
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
