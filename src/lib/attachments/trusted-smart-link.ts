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
