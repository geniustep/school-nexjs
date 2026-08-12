import { describe, expect, it } from 'vitest';
import { safeHttpsUrl, trustedVideoEmbedUrl, trustedVideoFromUserUrl } from './trusted-smart-link';

describe('trusted smart-link presentation', () => {
  it('accepts only credential-free HTTPS links', () => {
    expect(safeHttpsUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHttpsUrl('http://example.com')).toBeNull();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('https://user:pass@example.com')).toBeNull();
  });

  it('embeds only backend-trusted YouTube privacy and Vimeo players', () => {
    expect(trustedVideoEmbedUrl('https://www.youtube-nocookie.com/embed/abc')).toContain('youtube-nocookie.com');
    expect(trustedVideoEmbedUrl('https://player.vimeo.com/video/123')).toContain('player.vimeo.com');
    expect(trustedVideoEmbedUrl('https://youtube.com/embed/abc')).toBeNull();
    expect(trustedVideoEmbedUrl('https://evil.example/embed')).toBeNull();
  });

  it('builds a safe preview immediately from supported user video links', () => {
    expect(trustedVideoFromUserUrl('https://www.youtube.com/watch?v=aNFBseqZNUo')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/aNFBseqZNUo',
    });
    expect(trustedVideoFromUserUrl('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
    expect(trustedVideoFromUserUrl('https://youtube.example/watch?v=aNFBseqZNUo')).toBeNull();
  });
});
