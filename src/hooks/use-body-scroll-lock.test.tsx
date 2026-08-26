// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBodyScrollLock } from './use-body-scroll-lock';

function BodyScrollLock({ active }: { active: boolean }) {
  useBodyScrollLock(active);
  return null;
}

function LockHarness({ first, second }: { first: boolean; second: boolean }) {
  return (
    <>
      <BodyScrollLock active={first} />
      <BodyScrollLock active={second} />
    </>
  );
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('useBodyScrollLock', () => {
  it('keeps scrolling locked until the final overlapping lock is released', () => {
    const { rerender } = render(<LockHarness first second />);
    expect(document.body.style.overflow).toBe('hidden');

    // Release the first lock while the second one is still active. The old
    // implementation restored scrolling here and later left `hidden` behind.
    rerender(<LockHarness first={false} second />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<LockHarness first={false} second={false} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('restores the pre-existing inline overflow value after the final unlock', () => {
    document.body.style.overflow = 'auto';

    const { rerender } = render(<LockHarness first second />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<LockHarness first second={false} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<LockHarness first={false} second={false} />);
    expect(document.body.style.overflow).toBe('auto');
  });
});
