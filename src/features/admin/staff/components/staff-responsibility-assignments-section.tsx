'use client';

import { useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { resolveStaffPermissionLabel } from '@/features/admin/staff/utils/staff-center-present';
import { useStaffResponsibilityAssignments } from '@/features/admin/staff/hooks/use-staff-responsibility-assignments';
import {
  canEditStaffResponsibilityAssignment,
  canEndStaffResponsibilityAssignment,
  type StaffResponsibilityAssignment,
  type StaffResponsibilityAssignmentScopeType,
  type StaffResponsibilityAssignmentWritePayload,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';
import type { Locale } from '@/lib/i18n/config';
import type { StaffOptions } from '@/types/academic-setup';

const COPY: Record<Locale, Record<string, string>> = {
  ar: {
    title: 'المسؤوليات والصلاحيات',
    description: 'المسؤوليات الممنوحة لهذا الموظف والنطاق الذي تعمل داخله. الصلاحيات الفعلية أدناه تبقى مرجع التنفيذ النهائي.',
    add: 'إضافة مسؤولية',
    edit: 'تعديل',
    end: 'إنهاء المسؤولية',
    inherited: 'مسؤولية أساسية',
    manual: 'مسؤولية إضافية',
    readOnly: 'موروثة — للقراءة فقط',
    effective: 'فعالة الآن',
    inactive: 'غير فعالة',
    scope: 'النطاق',
    scopeSchool: 'المدرسة',
    scopeCycle: 'السلك',
    scopeLevels: 'المستويات',
    scopeClasses: 'الأقسام',
    capabilities: 'الصلاحيات',
    dates: 'فترة السريان',
    from: 'من',
    to: 'إلى',
    openEnded: 'مفتوحة',
    empty: 'لا توجد مسؤوليات مسجلة في هذا السياق المدرسي.',
    loading: 'جارٍ تحميل المسؤوليات…',
    retry: 'إعادة المحاولة',
    createTitle: 'إضافة مسؤولية',
    editTitle: 'تعديل المسؤولية',
    save: 'حفظ',
    cancel: 'إلغاء',
    chooseScope: 'مجال المسؤولية',
    chooseCapabilities: 'اختر الصلاحيات',
    noGrantableCapabilities: 'لا توجد صلاحيات متاحة للإسناد في السياق الحالي.',
    effectiveFrom: 'تاريخ البداية',
    effectiveTo: 'تاريخ النهاية (اختياري)',
    cycleReadonly: 'هذه مسؤولية على مستوى السلك. يمكن تعديل صلاحياتها وتواريخها أو نقلها إلى نطاق مدعوم من هذه الواجهة.',
    selectAtLeastOneCapability: 'اختر صلاحية واحدة على الأقل.',
    selectScopeTargets: 'اختر عناصر النطاق المطلوبة.',
    created: 'تمت إضافة المسؤولية.',
    updated: 'تم تحديث المسؤولية.',
    ended: 'تم إنهاء المسؤولية.',
    endTitle: 'إنهاء المسؤولية',
    endBody: 'سيتم إيقاف هذه المسؤولية ولن تعود فعالة. سيبقى السجل محفوظًا للتدقيق.',
    endConfirm: 'إنهاء',
    legacyError: 'المسؤولية الأساسية للقراءة فقط ولا يمكن تعديلها.',
    outsideSchoolError: 'يتضمن النطاق عنصرًا خارج المدرسة النشطة.',
    genericError: 'تعذر حفظ التغيير. راجع البيانات وحاول مرة أخرى.',
  },
  en: {
    title: 'Responsibilities & permissions',
    description: 'Assigned responsibilities and their scope. Effective permissions below remain the final execution view.',
    add: 'Add responsibility',
    edit: 'Edit',
    end: 'End responsibility',
    inherited: 'Base responsibility',
    manual: 'Additional responsibility',
    readOnly: 'Inherited — read only',
    effective: 'Effective now',
    inactive: 'Not effective',
    scope: 'Scope',
    scopeSchool: 'School',
    scopeCycle: 'Cycle',
    scopeLevels: 'Levels',
    scopeClasses: 'Classes',
    capabilities: 'Permissions',
    dates: 'Effective period',
    from: 'From',
    to: 'To',
    openEnded: 'Open-ended',
    empty: 'No responsibilities are recorded in this school context.',
    loading: 'Loading responsibilities…',
    retry: 'Retry',
    createTitle: 'Add responsibility',
    editTitle: 'Edit responsibility',
    save: 'Save',
    cancel: 'Cancel',
    chooseScope: 'Responsibility scope',
    chooseCapabilities: 'Choose permissions',
    noGrantableCapabilities: 'No grantable permissions are available in the current context.',
    effectiveFrom: 'Start date',
    effectiveTo: 'End date (optional)',
    cycleReadonly: 'This is a cycle-level responsibility. Its permissions and dates can be edited, or it can be moved to a scope supported by this screen.',
    selectAtLeastOneCapability: 'Select at least one permission.',
    selectScopeTargets: 'Select the required scope items.',
    created: 'Responsibility added.',
    updated: 'Responsibility updated.',
    ended: 'Responsibility ended.',
    endTitle: 'End responsibility',
    endBody: 'This responsibility will stop being effective. The record remains available for audit.',
    endConfirm: 'End',
    legacyError: 'Base responsibilities are read-only and cannot be edited.',
    outsideSchoolError: 'The selected scope contains an item outside the active school.',
    genericError: 'The change could not be saved. Review the data and try again.',
  },
  fr: {
    title: 'Responsabilités et autorisations',
    description: 'Responsabilités attribuées et leur périmètre. Les autorisations effectives ci-dessous restent la référence d’exécution.',
    add: 'Ajouter une responsabilité',
    edit: 'Modifier',
    end: 'Mettre fin',
    inherited: 'Responsabilité de base',
    manual: 'Responsabilité supplémentaire',
    readOnly: 'Héritée — lecture seule',
    effective: 'Effective maintenant',
    inactive: 'Non effective',
    scope: 'Périmètre',
    scopeSchool: 'Établissement',
    scopeCycle: 'Cycle',
    scopeLevels: 'Niveaux',
    scopeClasses: 'Classes',
    capabilities: 'Autorisations',
    dates: 'Période d’effet',
    from: 'Du',
    to: 'Au',
    openEnded: 'Sans date de fin',
    empty: 'Aucune responsabilité enregistrée dans ce contexte scolaire.',
    loading: 'Chargement des responsabilités…',
    retry: 'Réessayer',
    createTitle: 'Ajouter une responsabilité',
    editTitle: 'Modifier la responsabilité',
    save: 'Enregistrer',
    cancel: 'Annuler',
    chooseScope: 'Périmètre de responsabilité',
    chooseCapabilities: 'Choisir les autorisations',
    noGrantableCapabilities: 'Aucune autorisation attribuable dans le contexte actuel.',
    effectiveFrom: 'Date de début',
    effectiveTo: 'Date de fin (facultative)',
    cycleReadonly: 'Responsabilité au niveau du cycle : les autorisations et dates peuvent être modifiées, ou le périmètre peut être déplacé vers un type pris en charge ici.',
    selectAtLeastOneCapability: 'Sélectionnez au moins une autorisation.',
    selectScopeTargets: 'Sélectionnez les éléments requis du périmètre.',
    created: 'Responsabilité ajoutée.',
    updated: 'Responsabilité mise à jour.',
    ended: 'Responsabilité terminée.',
    endTitle: 'Mettre fin à la responsabilité',
    endBody: 'Cette responsabilité cessera d’être effective. Le registre restera conservé pour l’audit.',
    endConfirm: 'Mettre fin',
    legacyError: 'Les responsabilités de base sont en lecture seule.',
    outsideSchoolError: 'Le périmètre choisi contient un élément hors de l’établissement actif.',
    genericError: 'Impossible d’enregistrer la modification. Vérifiez les données puis réessayez.',
  },
  es: {
    title: 'Responsabilidades y permisos',
    description: 'Responsabilidades asignadas y su alcance. Los permisos efectivos de abajo siguen siendo la referencia final de ejecución.',
    add: 'Añadir responsabilidad',
    edit: 'Editar',
    end: 'Finalizar responsabilidad',
    inherited: 'Responsabilidad base',
    manual: 'Responsabilidad adicional',
    readOnly: 'Heredada — solo lectura',
    effective: 'Efectiva ahora',
    inactive: 'No efectiva',
    scope: 'Alcance',
    scopeSchool: 'Centro',
    scopeCycle: 'Ciclo',
    scopeLevels: 'Niveles',
    scopeClasses: 'Clases',
    capabilities: 'Permisos',
    dates: 'Periodo efectivo',
    from: 'Desde',
    to: 'Hasta',
    openEnded: 'Sin fecha final',
    empty: 'No hay responsabilidades registradas en este contexto escolar.',
    loading: 'Cargando responsabilidades…',
    retry: 'Reintentar',
    createTitle: 'Añadir responsabilidad',
    editTitle: 'Editar responsabilidad',
    save: 'Guardar',
    cancel: 'Cancelar',
    chooseScope: 'Alcance de la responsabilidad',
    chooseCapabilities: 'Elegir permisos',
    noGrantableCapabilities: 'No hay permisos asignables en el contexto actual.',
    effectiveFrom: 'Fecha de inicio',
    effectiveTo: 'Fecha final (opcional)',
    cycleReadonly: 'Esta responsabilidad corresponde al ciclo. Se pueden modificar permisos y fechas, o moverla a un alcance admitido por esta pantalla.',
    selectAtLeastOneCapability: 'Selecciona al menos un permiso.',
    selectScopeTargets: 'Selecciona los elementos de alcance requeridos.',
    created: 'Responsabilidad añadida.',
    updated: 'Responsabilidad actualizada.',
    ended: 'Responsabilidad finalizada.',
    endTitle: 'Finalizar responsabilidad',
    endBody: 'Esta responsabilidad dejará de ser efectiva. El registro se conservará para auditoría.',
    endConfirm: 'Finalizar',
    legacyError: 'Las responsabilidades base son de solo lectura.',
    outsideSchoolError: 'El alcance seleccionado contiene un elemento fuera del centro activo.',
    genericError: 'No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.',
  },
};

type FormState = {
  scopeType: StaffResponsibilityAssignmentScopeType;
  cycleIds: number[];
  levelIds: number[];
  classIds: number[];
  capabilityCodes: string[];
  yearPolicy: StaffResponsibilityAssignment['year_policy'];
  academicYearId: number | null;
  effectiveFrom: string;
  effectiveTo: string;
};

function emptyForm(): FormState {
  return {
    scopeType: 'school',
    cycleIds: [],
    levelIds: [],
    classIds: [],
    capabilityCodes: [],
    yearPolicy: 'follows_request_context',
    academicYearId: null,
    effectiveFrom: '',
    effectiveTo: '',
  };
}

function formFromAssignment(item: StaffResponsibilityAssignment): FormState {
  return {
    scopeType: item.scope_type,
    cycleIds: item.cycle_ids ?? [],
    levelIds: item.level_ids ?? [],
    classIds: item.class_ids ?? [],
    capabilityCodes: item.capability_codes ?? [],
    yearPolicy: item.year_policy,
    academicYearId: item.academic_year_id,
    effectiveFrom: item.effective_from ?? '',
    effectiveTo: item.effective_to ?? '',
  };
}

function toggleNumber(values: number[], value: number): number[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toggleString(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function buildWritePayload(form: FormState): StaffResponsibilityAssignmentWritePayload {
  const payload: StaffResponsibilityAssignmentWritePayload = {
    scope_type: form.scopeType,
    cycle_ids: form.scopeType === 'cycle' ? form.cycleIds : [],
    level_ids: form.scopeType === 'levels' ? form.levelIds : [],
    class_ids: form.scopeType === 'classes' ? form.classIds : [],
    capability_codes: form.capabilityCodes,
    year_policy: form.yearPolicy,
    effective_from: form.effectiveFrom || null,
    effective_to: form.effectiveTo || null,
  };
  if (form.yearPolicy === 'bound') payload.academic_year_id = form.academicYearId;
  return payload;
}

function resolveErrorMessage(code: string | undefined, fallback: string | undefined, copy: Record<string, string>) {
  if (code === 'responsibility_assignment_legacy_read_only') return copy.legacyError;
  if (code === 'responsibility_assignment_outside_school') return copy.outsideSchoolError;
  return fallback || copy.genericError;
}

export function StaffResponsibilityAssignmentsSection({
  userId,
  options,
  canManage,
  onChanged,
}: {
  userId: number;
  options?: StaffOptions;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const copy = COPY[locale];
  const toast = useToast();
  const assignments = useStaffResponsibilityAssignments(userId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffResponsibilityAssignment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [endTarget, setEndTarget] = useState<StaffResponsibilityAssignment | null>(null);

  const grantableCapabilities = useMemo(
    () => (options?.capabilities ?? []).filter((option) => option.grantable !== false),
    [options?.capabilities],
  );
  const levelName = useMemo(
    () => new Map((options?.levels ?? []).map((item) => [item.id, item.name])),
    [options?.levels],
  );
  const className = useMemo(
    () => new Map((options?.classes ?? []).map((item) => [item.id, item.name])),
    [options?.classes],
  );

  const supportedScopes = useMemo(() => {
    const fromOptions = (options?.scope_types ?? [])
      .filter((item) => ['school', 'levels', 'classes'].includes(item.value))
      .map((item) => ({ value: item.value as StaffResponsibilityAssignmentScopeType, label: item.label }));
    if (fromOptions.length) return fromOptions;
    return [
      { value: 'school' as const, label: copy.scopeSchool },
      { value: 'levels' as const, label: copy.scopeLevels },
      { value: 'classes' as const, label: copy.scopeClasses },
    ];
  }, [options?.scope_types, copy]);

  function capabilityLabel(code: string): string {
    return resolveStaffPermissionLabel(code, locale, t) ?? code;
  }

  function scopeLabel(item: StaffResponsibilityAssignment): string {
    if (item.scope_type === 'school') return copy.scopeSchool;
    if (item.scope_type === 'cycle') {
      return `${copy.scopeCycle}: ${(item.cycle_ids ?? []).map((id) => `#${id}`).join(', ') || '—'}`;
    }
    if (item.scope_type === 'levels') {
      const names = (item.level_ids ?? []).map((id) => levelName.get(id) ?? `#${id}`);
      return `${copy.scopeLevels}: ${names.join(', ') || '—'}`;
    }
    if (item.scope_type === 'classes') {
      const names = (item.class_ids ?? []).map((id) => className.get(id) ?? `#${id}`);
      return `${copy.scopeClasses}: ${names.join(', ') || '—'}`;
    }
    return item.scope_type;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(item: StaffResponsibilityAssignment) {
    if (!canEditStaffResponsibilityAssignment(item)) return;
    setEditing(item);
    setForm(formFromAssignment(item));
    setFormOpen(true);
  }

  function validateForm(): boolean {
    if (!form.capabilityCodes.length) {
      toast.error(copy.selectAtLeastOneCapability);
      return false;
    }
    if (
      (form.scopeType === 'cycle' && !form.cycleIds.length) ||
      (form.scopeType === 'levels' && !form.levelIds.length) ||
      (form.scopeType === 'classes' && !form.classIds.length)
    ) {
      toast.error(copy.selectScopeTargets);
      return false;
    }
    return true;
  }

  async function saveForm() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = buildWritePayload(form);
      const response = editing
        ? await assignments.update(editing.id, payload)
        : await assignments.create(payload);
      if (!response) return;
      if (!response.success) {
        toast.error(resolveErrorMessage(response.error.code, response.error.message, copy));
        return;
      }
      toast.success(editing ? copy.updated : copy.created);
      setFormOpen(false);
      setEditing(null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function endAssignment() {
    if (!endTarget) return;
    const response = await assignments.end(endTarget.id, {
      end_reason: 'ended_from_staff_profile',
    });
    if (!response) return;
    if (!response.success) {
      toast.error(resolveErrorMessage(response.error.code, response.error.message, copy));
      return;
    }
    toast.success(copy.ended);
    setEndTarget(null);
    onChanged?.();
  }

  return (
    <Card className="staff-center-section">
      <SectionHead
        title={copy.title}
        action={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
              {copy.add}
            </button>
          ) : undefined
        }
      />
      <p className="muted" style={{ marginTop: 0 }}>{copy.description}</p>

      {assignments.loading ? <p className="muted">{copy.loading}</p> : null}
      {assignments.error ? (
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">{resolveErrorMessage(assignments.error.code, assignments.error.message, copy)}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void assignments.reload()}>
            {copy.retry}
          </button>
        </div>
      ) : null}

      {!assignments.loading && !assignments.error && !assignments.items.length ? (
        <p className="muted">{copy.empty}</p>
      ) : null}

      <div className="col" style={{ gap: 10 }}>
        {assignments.items.map((item) => {
          const canEdit = canManage && canEditStaffResponsibilityAssignment(item);
          const canEnd = canManage && canEndStaffResponsibilityAssignment(item);
          return (
            <article
              key={item.id}
              style={{
                border: '1px solid var(--c-border)',
                borderRadius: 12,
                padding: 12,
                display: 'grid',
                gap: 10,
              }}
            >
              <div className="between" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <Badge tone={item.origin === 'manual' ? 'blue' : 'slate'}>
                    {item.origin === 'manual' ? copy.manual : copy.inherited}
                  </Badge>
                  <Badge tone={item.is_effective ? 'green' : 'amber'}>
                    {item.is_effective ? copy.effective : copy.inactive}
                  </Badge>
                  {item.origin !== 'manual' ? <span className="tiny muted">{copy.readOnly}</span> : null}
                </div>
                {(canEdit || canEnd) ? (
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {canEdit ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(item)}>
                        {copy.edit}
                      </button>
                    ) : null}
                    {canEnd ? (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEndTarget(item)}>
                        {copy.end}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div><strong>{copy.scope}:</strong> <span>{scopeLabel(item)}</span></div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{copy.capabilities}:</strong>
                  {(item.capability_codes ?? []).map((code) => (
                    <Badge key={code} tone="blue">{capabilityLabel(code)}</Badge>
                  ))}
                </div>
                <div className="muted tiny">
                  {copy.dates}: {copy.from} {item.effective_from ?? '—'} · {copy.to} {item.effective_to ?? copy.openEnded}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmationDialog
        open={formOpen}
        title={editing ? copy.editTitle : copy.createTitle}
        confirmLabel={copy.save}
        cancelLabel={copy.cancel}
        size="form"
        loading={saving}
        closeOnBackdrop={!saving}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onConfirm={saveForm}
        body={
          <div className="col" style={{ gap: 14 }}>
            <label className="field">
              <span className="field__label">{copy.chooseScope}</span>
              <select
                className="input"
                value={form.scopeType}
                onChange={(event) => {
                  const next = event.target.value as StaffResponsibilityAssignmentScopeType;
                  setForm((current) => ({
                    ...current,
                    scopeType: next,
                    cycleIds: next === 'cycle' ? current.cycleIds : [],
                    levelIds: next === 'levels' ? current.levelIds : [],
                    classIds: next === 'classes' ? current.classIds : [],
                  }));
                }}
              >
                {editing?.scope_type === 'cycle' ? <option value="cycle">{copy.scopeCycle}</option> : null}
                {supportedScopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>{scope.label}</option>
                ))}
              </select>
            </label>

            {form.scopeType === 'cycle' ? (
              <div className="muted">{copy.cycleReadonly}</div>
            ) : null}

            {form.scopeType === 'levels' ? (
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label">{copy.scopeLevels}</legend>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  {(options?.levels ?? []).map((level) => (
                    <label key={level.id} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.levelIds.includes(level.id)}
                        onChange={() => setForm((current) => ({ ...current, levelIds: toggleNumber(current.levelIds, level.id) }))}
                      />
                      <span>{level.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {form.scopeType === 'classes' ? (
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label">{copy.scopeClasses}</legend>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {(options?.classes ?? []).map((klass) => (
                    <label key={klass.id} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.classIds.includes(klass.id)}
                        onChange={() => setForm((current) => ({ ...current, classIds: toggleNumber(current.classIds, klass.id) }))}
                      />
                      <span>{klass.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field__label">{copy.chooseCapabilities}</legend>
              {grantableCapabilities.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                  {grantableCapabilities.map((capability) => (
                    <label key={capability.code} className="row" style={{ gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={form.capabilityCodes.includes(capability.code)}
                        onChange={() => setForm((current) => ({
                          ...current,
                          capabilityCodes: toggleString(current.capabilityCodes, capability.code),
                        }))}
                      />
                      <span>{capabilityLabel(capability.code)}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <span className="muted">{copy.noGrantableCapabilities}</span>
              )}
            </fieldset>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <label className="field">
                <span className="field__label">{copy.effectiveFrom}</span>
                <input
                  type="date"
                  className="input"
                  value={form.effectiveFrom}
                  onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field__label">{copy.effectiveTo}</span>
                <input
                  type="date"
                  className="input"
                  value={form.effectiveTo}
                  onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))}
                />
              </label>
            </div>
          </div>
        }
      />

      <ConfirmationDialog
        open={Boolean(endTarget)}
        title={copy.endTitle}
        body={copy.endBody}
        confirmLabel={copy.endConfirm}
        cancelLabel={copy.cancel}
        variant="danger"
        onClose={() => setEndTarget(null)}
        onConfirm={endAssignment}
      />
    </Card>
  );
}
