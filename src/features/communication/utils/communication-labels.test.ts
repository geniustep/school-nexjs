import { describe, expect, it } from 'vitest';
import {
  communicationActorRoleMessageKey,
  communicationAuditDecisionMessageKey,
  communicationContentTypeMessageKey,
  communicationStateMessageKey,
} from './communication-labels';

describe('communication label keys', () => {
  it('maps product content and state codes to translation keys', () => {
    expect(communicationContentTypeMessageKey('announcement')).toBe(
      'communication.contentType.announcement',
    );
    expect(communicationContentTypeMessageKey('message')).toBe(
      'communication.contentType.message',
    );
    expect(communicationStateMessageKey('submitted')).toBe(
      'communication.state.submitted',
    );
  });

  it('never requires the review UI to expose actor role codes raw', () => {
    expect(communicationActorRoleMessageKey('admin')).toBe('roles.admin');
    expect(communicationActorRoleMessageKey('teacher')).toBe('roles.teacher');
    expect(communicationActorRoleMessageKey('guardian')).toBe('roles.parent');
    expect(communicationActorRoleMessageKey('unknown_backend_role')).toBeNull();
  });

  it('maps audit decision codes to existing translated workflow labels', () => {
    expect(communicationAuditDecisionMessageKey('submit')).toBe(
      'communication.state.submitted',
    );
    expect(communicationAuditDecisionMessageKey('approved')).toBe('states.approved');
    expect(communicationAuditDecisionMessageKey('publish')).toBe(
      'communication.state.published',
    );
    expect(communicationAuditDecisionMessageKey('unmapped_decision')).toBe(
      'communication.state.unknown',
    );
  });
});
