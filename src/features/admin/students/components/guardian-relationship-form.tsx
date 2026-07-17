'use client';

import type { GuardianRelationshipCreatePayload, RelationshipType } from '@/types/student-360';
import {
  relationshipFormToCreatePayload as relationshipFormToCreatePayloadImpl,
  relationshipFormToLinkPersonPayload,
  relationshipFormToUpdatePayload as relationshipFormToUpdatePayloadImpl,
} from '../utils/guardian-relationship-payload';
import { GuardianRelationshipFields } from './guardian-relationship-fields';

export { relationshipFormToLinkPersonPayload, relationshipFormToUpdatePayloadImpl as relationshipFormToUpdatePayload };

export interface RelationshipFormValues {
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
  is_legal_guardian: boolean;
  is_financial_responsible: boolean;
  receives_notifications: boolean;
  is_emergency_contact: boolean;
  is_authorized_pickup: boolean;
  contact_priority: string;
  date_start: string;
  notes: string;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DEFAULT_RELATIONSHIP_FORM: RelationshipFormValues = {
  relationship_type: 'father',
  is_primary_contact: false,
  is_legal_guardian: false,
  is_financial_responsible: false,
  receives_notifications: true,
  is_emergency_contact: false,
  is_authorized_pickup: false,
  contact_priority: '',
  date_start: todayIsoDate(),
  notes: '',
};

export function GuardianRelationshipForm({
  values,
  onChange,
  fieldError,
}: {
  values: RelationshipFormValues;
  onChange: (next: RelationshipFormValues) => void;
  fieldError?: string | null;
}) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <GuardianRelationshipFields values={values} onChange={onChange} />
      {fieldError ? (
        <p className="tiny guardian-create-field__error">{fieldError}</p>
      ) : null}
    </div>
  );
}

export function relationshipFormToCreatePayload(
  guardianId: number,
  values: RelationshipFormValues,
): GuardianRelationshipCreatePayload {
  return relationshipFormToCreatePayloadImpl(guardianId, values);
}

export function relationshipToFormValues(rel: import('@/types/student-360').GuardianRelationship): RelationshipFormValues {
  return {
    relationship_type: rel.relationship_type,
    is_primary_contact: rel.is_primary_contact,
    is_legal_guardian: rel.is_legal_guardian,
    is_financial_responsible: rel.is_financial_responsible,
    receives_notifications: rel.receives_notifications,
    is_emergency_contact: rel.is_emergency_contact,
    is_authorized_pickup: rel.is_authorized_pickup,
    contact_priority: rel.contact_priority != null ? String(rel.contact_priority) : '',
    date_start: rel.date_start ?? todayIsoDate(),
    notes: rel.notes ?? '',
  };
}
