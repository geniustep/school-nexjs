import type {
  GuardianRelationshipCreatePayload,
  LinkPersonAsGuardianPayload,
  PersonSearchResult,
} from '@/types/student-360';
import type { RelationshipFormValues } from '../components/guardian-relationship-form';

function relationshipFields(
  values: RelationshipFormValues,
): Omit<GuardianRelationshipCreatePayload, 'guardian_id'> {
  const payload: Omit<GuardianRelationshipCreatePayload, 'guardian_id'> = {
    relationship_type: values.relationship_type,
    is_primary_contact: values.is_primary_contact,
    is_legal_guardian: values.is_legal_guardian,
    is_financial_responsible: values.is_financial_responsible,
    receives_notifications: values.receives_notifications,
    is_emergency_contact: values.is_emergency_contact,
    is_authorized_pickup: values.is_authorized_pickup,
  };
  const priority = Number(values.contact_priority);
  if (Number.isInteger(priority) && priority > 0) payload.contact_priority = priority;
  if (values.date_start.trim()) payload.date_start = values.date_start.trim();
  if (values.notes.trim()) payload.notes = values.notes.trim();
  return payload;
}

export function relationshipFormToLinkPersonPayload(
  person: Pick<PersonSearchResult, 'partner_id'>,
  values: RelationshipFormValues,
): LinkPersonAsGuardianPayload {
  return {
    partner_id: person.partner_id,
    ...relationshipFields(values),
  };
}

export function relationshipFormToCreatePayload(
  guardianId: number,
  values: RelationshipFormValues,
): GuardianRelationshipCreatePayload {
  return {
    guardian_id: guardianId,
    ...relationshipFields(values),
  };
}
