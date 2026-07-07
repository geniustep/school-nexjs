import { describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './copy-text';

describe('copyTextToClipboard', () => {
  it('returns false for blank values', async () => {
    await expect(copyTextToClipboard('   ')).resolves.toBe(false);
  });

  it('writes trimmed text to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await expect(copyTextToClipboard('  G-1234  ')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('G-1234');
  });
});
