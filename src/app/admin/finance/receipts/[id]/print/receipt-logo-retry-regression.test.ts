import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(
    process.cwd(),
    'src',
    'app',
    'admin',
    'finance',
    'receipts',
    '[id]',
    'print',
    'page.tsx',
  ),
  'utf8',
);

describe('French receipt school logo hydration retry', () => {
  it('tracks the failed logo URL instead of permanently disabling the image', () => {
    expect(pageSource).toContain(
      'const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);',
    );
    expect(pageSource).toContain('logoUrl && failedLogoUrl !== logoUrl');
    expect(pageSource).toContain('onError={() => setFailedLogoUrl(logoUrl)}');
    expect(pageSource).not.toContain('const [logoFailed, setLogoFailed] = useState(false);');
  });
});
