'use client';

import { useLocale } from '@/features/i18n/locale-context';
import type {
  GuardianAccountAccessPolicy,
  GuardianLegalStatus,
} from '@/types/guardian-access';
import {
  guardianAccessCopy,
  resolveGuardianAccessOutcome,
} from '../utils/guardian-access-contract';
import './guardian-legal-access.css';

function ChoiceCard<T extends string>({
  name,
  value,
  current,
  label,
  hint,
  onChange,
}: {
  name: string;
  value: T;
  current: T;
  label: string;
  hint: string;
  onChange: (value: T) => void;
}) {
  const selected = current === value;
  return (
    <label className={`guardian-access-choice${selected ? ' guardian-access-choice--selected' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
      />
      <span className="guardian-access-choice__marker" aria-hidden="true" />
      <span className="guardian-access-choice__content">
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
    </label>
  );
}

export function GuardianLegalAccessFields({
  legalStatus,
  accountAccessPolicy,
  onLegalStatusChange,
  onAccountAccessPolicyChange,
}: {
  legalStatus: GuardianLegalStatus;
  accountAccessPolicy: GuardianAccountAccessPolicy;
  onLegalStatusChange: (status: GuardianLegalStatus) => void;
  onAccountAccessPolicyChange: (policy: GuardianAccountAccessPolicy) => void;
}) {
  const { locale } = useLocale();
  const copy = guardianAccessCopy(locale);
  const outcome = resolveGuardianAccessOutcome(legalStatus, accountAccessPolicy);
  const outcomeText = {
    allowed_explicit: copy.outcomeAllowedExplicit,
    allowed_legal: copy.outcomeAllowedLegal,
    pending_legal: copy.outcomePendingLegal,
    denied_not_legal: copy.outcomeDeniedNotLegal,
    blocked: copy.outcomeBlocked,
  }[outcome];
  const outcomeTone = outcome.startsWith('allowed')
    ? 'success'
    : outcome === 'pending_legal'
      ? 'pending'
      : 'blocked';

  return (
    <section className="guardian-legal-access" aria-labelledby="guardian-legal-access-title">
      <div className="guardian-legal-access__intro">
        <h4 id="guardian-legal-access-title">{copy.sectionTitle}</h4>
        <p>{copy.sectionHint}</p>
      </div>

      <fieldset className="guardian-legal-access__fieldset">
        <legend>{copy.legalTitle}</legend>
        <div className="guardian-legal-access__choices">
          <ChoiceCard
            name="guardian-legal-status"
            value="unknown"
            current={legalStatus}
            label={copy.legalUnknown}
            hint={copy.legalUnknownHint}
            onChange={onLegalStatusChange}
          />
          <ChoiceCard
            name="guardian-legal-status"
            value="yes"
            current={legalStatus}
            label={copy.legalYes}
            hint={copy.legalYesHint}
            onChange={onLegalStatusChange}
          />
          <ChoiceCard
            name="guardian-legal-status"
            value="no"
            current={legalStatus}
            label={copy.legalNo}
            hint={copy.legalNoHint}
            onChange={onLegalStatusChange}
          />
        </div>
      </fieldset>

      <fieldset className="guardian-legal-access__fieldset">
        <legend>{copy.accessTitle}</legend>
        <div className="guardian-legal-access__choices">
          <ChoiceCard
            name="guardian-account-access"
            value="inherit_legal"
            current={accountAccessPolicy}
            label={copy.accessInherit}
            hint={copy.accessInheritHint}
            onChange={onAccountAccessPolicyChange}
          />
          <ChoiceCard
            name="guardian-account-access"
            value="allowed"
            current={accountAccessPolicy}
            label={copy.accessAllowed}
            hint={copy.accessAllowedHint}
            onChange={onAccountAccessPolicyChange}
          />
          <ChoiceCard
            name="guardian-account-access"
            value="blocked"
            current={accountAccessPolicy}
            label={copy.accessBlocked}
            hint={copy.accessBlockedHint}
            onChange={onAccountAccessPolicyChange}
          />
        </div>
      </fieldset>

      <div className={`guardian-legal-access__outcome guardian-legal-access__outcome--${outcomeTone}`} role="status">
        <span className="guardian-legal-access__outcome-dot" aria-hidden="true" />
        <p>{outcomeText}</p>
      </div>
    </section>
  );
}
