import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatLastActionSummary } from './admission-last-action-display';
import { sliceRequestedServiceLabels } from './admission-requested-services';
import {
  contactResultLabelKey,
  isTechnicalRawCode,
  modernActionLabelKey,
  resolveOperationalActionLabel,
  resolveOperationalActorLabel,
  resolveOperationalResultLabel,
} from './admission-operational-labels';

const tAr: Record<string, string> = {
  'admin.admissions.contactResults.reached': 'تم التواصل',
  'admin.admissions.contactResults.no_answer': 'لا جواب',
  'admin.admissions.actions.logContact': 'تسجيل تواصل',
  'admin.admissions.actions.accept': 'قبول',
  'admin.admissions.card.administrativeRole': 'المسؤول الإداري',
  'admin.admissions.card.unknownActivity': 'نشاط إداري',
};

function t(key: string) {
  return tAr[key] ?? key;
}

describe('admission operational labels (Kanban card)', () => {
  it('maps reached and does not leave raw enum for UI', () => {
    expect(contactResultLabelKey('reached')).toBe('admin.admissions.contactResults.reached');
    expect(resolveOperationalResultLabel('reached', t)).toBe('تم التواصل');
    expect(resolveOperationalResultLabel('reached', t)).not.toBe('reached');
  });

  it('maps log_contact to a translated action label', () => {
    expect(modernActionLabelKey('log_contact')).toBe('admin.admissions.actions.logContact');
    expect(resolveOperationalActionLabel('log_contact', t)).toBe('تسجيل تواصل');
    expect(resolveOperationalActionLabel('log_contact', t)).not.toContain('log_contact');
  });

  it('maps Administrator technical actor name', () => {
    expect(resolveOperationalActorLabel('Administrator', t)).toBe('المسؤول الإداري');
    expect(resolveOperationalActorLabel('Administrator', t)).not.toBe('Administrator');
  });

  it('keeps real human display names', () => {
    expect(resolveOperationalActorLabel('سلمى أمين', t)).toBe('سلمى أمين');
  });

  it('falls back safely for unknown codes', () => {
    expect(isTechnicalRawCode('weird_code_x')).toBe(true);
    expect(resolveOperationalResultLabel('weird_code_x', t)).toBe('نشاط إداري');
    expect(resolveOperationalActionLabel('totally_unknown_action', t)).toBe('نشاط إداري');
  });

  it('formats last activity with mapped result/actor and separate occurredAt', () => {
    const summary = formatLastActionSummary(
      {
        result: 'reached',
        actor_name: 'Administrator',
        occurred_at: '2026-07-14T22:18:00Z',
      },
      {
        resolveResult: (raw) => resolveOperationalResultLabel(raw, t),
        resolveActor: (raw) => resolveOperationalActorLabel(raw, t),
      },
    );
    expect(summary.key).toBeNull();
    expect(summary.result).toBe('تم التواصل');
    expect(summary.actor).toBe('المسؤول الإداري');
    expect(summary.occurredAt).toBe('2026-07-14T22:18:00Z');
    expect(summary.parts.join(' ')).not.toContain('reached');
    expect(summary.parts.join(' ')).not.toContain('Administrator');
  });

  it('slices services for +N presentation', () => {
    const services = [
      { id: 1, code: 'a', name: 'نقل', active: true },
      { id: 2, code: 'b', name: 'مطعم', active: true },
      { id: 3, code: 'c', name: 'حراسة', active: true },
      { id: 4, code: 'd', name: 'أنشطة', active: true },
    ];
    expect(sliceRequestedServiceLabels(services, 3).visible).toHaveLength(3);
    expect(sliceRequestedServiceLabels(services, 3).remaining).toBe(1);
    expect(sliceRequestedServiceLabels(services, 2).remaining).toBe(2);
  });

  it('Kanban board opts out of duplicated status badge', () => {
    const src = readFileSync(
      resolve(__dirname, '../components/admissions-raw-state-kanban.tsx'),
      'utf8',
    );
    expect(src).toMatch(/showStateBadge=\{false\}/);
  });

  it('card keeps SR status when badge is hidden', () => {
    const src = readFileSync(resolve(__dirname, '../components/admission-card.tsx'), 'utf8');
    expect(src).toMatch(/admission-card-status-sr/);
    expect(src).toMatch(/applicationStatusLabelKey/);
    expect(src).toMatch(/admission-card--operational/);
    expect(src).not.toMatch(/reached/);
  });

  it('card tools remain outside the content link', () => {
    const src = readFileSync(resolve(__dirname, '../components/admission-card.tsx'), 'utf8');
    expect(src).toMatch(/admission-card__tools/);
    expect(src).toMatch(/admission-card__header/);
    const headerIdx = src.indexOf('admission-card__header');
    const linkIdx = src.indexOf('admission-card__link');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(linkIdx).toBeGreaterThan(headerIdx);
  });
});
