export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function trustedVideoEmbedUrl(value: string | null | undefined): string | null {
  const safe = safeHttpsUrl(value);
  if (!safe) return null;
  const host = new URL(safe).hostname.toLowerCase();
  return host === 'www.youtube-nocookie.com' || host === 'youtube-nocookie.com' || host === 'player.vimeo.com'
    ? safe
    : null;
}

export function trustedVideoFromUserUrl(value: string): {
  provider: 'youtube' | 'vimeo';
  embedUrl: string;
} | null {
  const safe = safeHttpsUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  let youtubeId: string | null = null;
  if (host === 'youtu.be') youtubeId = url.pathname.split('/').filter(Boolean)[0] ?? null;
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') youtubeId = url.searchParams.get('v');
    else if (/^\/(?:embed|shorts)\//.test(url.pathname)) youtubeId = url.pathname.split('/')[2] ?? null;
  }
  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) {
    return { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  }

  let vimeoId: string | null = null;
  if (host === 'vimeo.com') vimeoId = url.pathname.split('/').filter(Boolean).reverse().find((part) => /^\d{6,12}$/.test(part)) ?? null;
  if (host === 'player.vimeo.com' && url.pathname.startsWith('/video/')) vimeoId = url.pathname.split('/')[2] ?? null;
  if (vimeoId && /^\d{6,12}$/.test(vimeoId)) {
    return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}` };
  }
  return null;
}
