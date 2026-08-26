import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appointmentDefaultEnd } from './appointment-schedule';

describe('appointment scheduling UX', () => {
  it('defaults the appointment end to 30 minutes after the selected start', () => {
    expect(appointmentDefaultEnd('2026-08-28T10:10')).toBe('2026-08-28T10:40');
    expect(appointmentDefaultEnd('2026-08-28T23:50')).toBe('2026-08-29T00:20');
    expect(appointmentDefaultEnd('')).toBe('');
  });

  it('keeps the proposal form limited to requested appointments', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./components/admin-request-appointment-panel.tsx', import.meta.url)),
      'utf8',
    );
    expect(source).toContain('const appointmentState = appointment.appointment_state');
    expect(source).toContain("appointmentState === 'requested'");
    expect(source).toContain("appointmentState !== 'requested'");
    expect(source).toContain('setScheduledEnd(appointmentDefaultEnd(nextStart))');
  });

  it('collapses generic request actions into a selector and one execution button', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./components/admin-request-detail-page.tsx', import.meta.url)),
      'utf8',
    );
    expect(source).toContain("adminRequestControlsMessage(locale, 'actions.choose')");
    expect(source).toContain("adminRequestControlsMessage(locale, 'actions.execute')");
    expect(source).toContain("currentAction === 'refer'");
    expect(source).not.toContain('visibleActions.map((action) => (\n                      <button');
  });
});
