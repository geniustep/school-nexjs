'use client';

import { EmptyState } from '@/components/states/states';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { StaffWarningsPanel } from '@/features/admin/staff/components/staff-warnings-panel';
import { useT } from '@/features/i18n/locale-context';
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import type { StaffEffectivePermissionsPayload, StaffMember } from '@/types/academic-setup';

function CapabilityList({ items, emptyLabel }: { items?: string[]; emptyLabel: string }) {
  if (!items?.length) return <span className="muted">{emptyLabel}</span>;
  return (
    <div className="staff-center-chip-list">
      {items.map((item) => (
        <Badge key={item} tone="blue">
          {item}
        </Badge>
      ))}
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

  return (
    <Card className="staff-center-section">
      <SectionHead title={t('admin.staffCenter.effectivePermissionsTitle')} />
      <StaffWarningsPanel warnings={permissionWarnings} />
      <DefinitionList
        items={[
          {
            label: t('admin.staffCenter.adminKind'),
            value: member.admin_kind
              ? resolveStaffAdminKindLabel(member.admin_kind, t)
              : t('common.dash'),
          },
          {
            label: t('admin.staffCenter.permissionsMode'),
            value: (payload?.permissions_mode ?? member.permissions_mode) || t('common.dash'),
          },
          {
            label: t('admin.staffCenter.assignedCapabilities'),
            value: (
              <CapabilityList
                items={assigned}
                emptyLabel={t('admin.staffCenter.noAssignedCapabilities')}
              />
            ),
          },
          {
            label: t('admin.staffCenter.effectiveCapabilities'),
            value: (
              <CapabilityList
                items={effectiveCaps}
                emptyLabel={t('admin.staffCenter.noEffectiveCapabilities')}
              />
            ),
          },
          {
            label: t('admin.staffCenter.effectivePermissions'),
            value: (
              <CapabilityList
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
                    value: scope.role_template_name ?? scope.role_template_code ?? t('common.dash'),
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
                      <CapabilityList
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
  if (!templates.length) return null;

  return (
    <Card className="staff-center-section">
      <SectionHead title={t('admin.staffCenter.roleTemplatesTitle')} />
      <div className="staff-center-chip-list">
        {templates.map((template, index) => {
          const label =
            typeof template === 'string'
              ? template
              : template.label ?? template.admin_kind ?? String(index);
          return (
            <Badge key={`${label}-${index}`} tone="slate">
              {label}
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}
