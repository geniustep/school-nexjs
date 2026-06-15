'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { RELATIONSHIP_TYPE_CODES, relationshipTypeLabel } from '../utils/relationship-types';
import type { RelationshipFormValues } from './guardian-relationship-form';

const CONTACT_PRIORITY_OPTIONS = ['1', '2', '3'] as const;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="guardian-relationship-fields__field">
      <span className="tiny muted">{label}</span>
      {children}
      {hint ? <span className="tiny muted guardian-relationship-fields__hint">{hint}</span> : null}
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="guardian-relationship-fields__checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tiny">{label}</span>
    </label>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="guardian-relationship-fields__group">
      <legend className="guardian-relationship-fields__group-title">{title}</legend>
      <div className="guardian-relationship-fields__group-body">{children}</div>
    </fieldset>
  );
}

export function contactPriorityLabel(t: (key: string) => string, value: string): string {
  switch (value) {
    case '1':
      return t('admin.parentProfile.contactPriorityFirst');
    case '2':
      return t('admin.parentProfile.contactPrioritySecond');
    case '3':
      return t('admin.parentProfile.contactPriorityThird');
    default:
      return t('common.dash');
  }
}

export function GuardianRelationshipFields({
  values,
  onChange,
}: {
  values: RelationshipFormValues;
  onChange: (next: RelationshipFormValues) => void;
}) {
  const t = useT();
  const [additionalOpen, setAdditionalOpen] = useState(Boolean(values.date_start || values.notes.trim()));

  function patch(partial: Partial<RelationshipFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="guardian-relationship-fields">
      <FieldGroup title={t('admin.parentProfile.relationshipNature')}>
        <Field label={t('admin.student360.relationshipTypeLabel')}>
          <select
            className="input"
            required
            value={values.relationship_type}
            onChange={(e) => patch({ relationship_type: e.target.value })}
          >
            {RELATIONSHIP_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {relationshipTypeLabel(t, code)}
              </option>
            ))}
          </select>
        </Field>
        <div className="guardian-relationship-fields__checks">
          <CheckboxField
            label={t('admin.student360.primaryContact')}
            checked={values.is_primary_contact}
            onChange={(checked) => patch({ is_primary_contact: checked })}
          />
          <CheckboxField
            label={t('admin.student360.legalGuardian')}
            checked={values.is_legal_guardian}
            onChange={(checked) => patch({ is_legal_guardian: checked })}
          />
        </div>
      </FieldGroup>

      <FieldGroup title={t('admin.parentProfile.financialCommunication')}>
        <div className="guardian-relationship-fields__checks">
          <CheckboxField
            label={t('admin.student360.financialResponsible')}
            checked={values.is_financial_responsible}
            onChange={(checked) => patch({ is_financial_responsible: checked })}
          />
          <CheckboxField
            label={t('admin.student360.receivesNotifications')}
            checked={values.receives_notifications}
            onChange={(checked) => patch({ receives_notifications: checked })}
          />
        </div>
        <Field
          label={t('admin.student360.contactPriority')}
          hint={t('admin.parentProfile.contactPriorityHint')}
        >
          <select
            className="input"
            value={values.contact_priority}
            onChange={(e) => patch({ contact_priority: e.target.value })}
          >
            <option value="">{t('common.dash')}</option>
            {CONTACT_PRIORITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {contactPriorityLabel(t, value)}
              </option>
            ))}
          </select>
        </Field>
      </FieldGroup>

      <FieldGroup title={t('admin.parentProfile.safetyPickup')}>
        <div className="guardian-relationship-fields__checks">
          <CheckboxField
            label={t('admin.student360.emergencyContact')}
            checked={values.is_emergency_contact}
            onChange={(checked) => patch({ is_emergency_contact: checked })}
          />
          <CheckboxField
            label={t('admin.student360.authorizedPickup')}
            checked={values.is_authorized_pickup}
            onChange={(checked) => patch({ is_authorized_pickup: checked })}
          />
        </div>
      </FieldGroup>

      <details
        className="guardian-relationship-fields__additional"
        open={additionalOpen}
        onToggle={(e) => setAdditionalOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>{t('admin.parentProfile.additionalOptions')}</summary>
        <div className="guardian-relationship-fields__additional-body">
          <Field label={t('admin.student360.dateStart')}>
            <input
              className="input"
              type="date"
              value={values.date_start}
              onChange={(e) => patch({ date_start: e.target.value })}
            />
          </Field>
          <Field label={t('admin.student360.notes')}>
            <textarea
              className="textarea"
              rows={3}
              value={values.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
        </div>
      </details>
    </div>
  );
}
