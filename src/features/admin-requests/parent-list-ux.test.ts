import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { adminRequestCardStyle, adminRequestStateTone } from './list-visuals';

describe('parent admin request list UX', () => {
  it('enables the shared filters for parent requests while keeping closed requests visible', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./components/admin-request-list-page.tsx', import.meta.url)),
      'utf8',
    );

    expect(source).toContain("const supportsFilters = role === 'admin' || role === 'parent'");
    expect(source).toContain("const includeClosed = role === 'parent' ? true : showClosed");
    expect(source).toContain("adminRequestControlsMessage(locale, 'list.resetFilters')");
  });

  it('maps workflow states to calm semantic tones', () => {
    expect(adminRequestStateTone('submitted')).toBe('blue');
    expect(adminRequestStateTone('under_review')).toBe('amber');
    expect(adminRequestStateTone('waiting_requester')).toBe('amber');
    expect(adminRequestStateTone('resolved')).toBe('green');
    expect(adminRequestStateTone('rejected')).toBe('red');
    expect(adminRequestStateTone('closed')).toBe('slate');
    expect(adminRequestStateTone('unknown_state')).toBe('slate');
  });

  it('uses the same semantic tone for the card surface and border', () => {
    expect(adminRequestCardStyle('resolved')).toEqual({
      background: 'var(--c-green-soft)',
      borderColor: 'color-mix(in srgb, var(--c-green) 28%, var(--c-border))',
    });
    expect(adminRequestCardStyle('closed').background).toBe('var(--c-slate-soft)');
  });
});
