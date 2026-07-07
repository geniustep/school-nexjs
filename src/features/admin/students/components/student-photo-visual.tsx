'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveStudentGenderPlaceholder } from '../utils/resolve-student-gender-placeholder';
import { resolveStudentPhotoCandidates } from '../utils/resolve-student-photo-url';
import type { Gender } from '@/types/student';

function withCacheBust(url: string, cacheBust?: string | number | null): string {
  if (!cacheBust) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(String(cacheBust))}`;
}

export function StudentPhotoVisual({
  gender,
  imageUrl,
  thumbnailUrl,
  displayName,
  className,
  imageClassName,
  placeholderClassName,
  cacheBust,
  photoAlt,
  placeholderAriaLabel,
}: {
  gender: Gender | string | null | undefined;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  displayName: string;
  className?: string;
  imageClassName?: string;
  placeholderClassName?: string;
  cacheBust?: string | number | null;
  photoAlt?: string;
  placeholderAriaLabel?: string;
}) {
  const candidates = useMemo(
    () =>
      resolveStudentPhotoCandidates(
        { image_url: imageUrl, thumbnail_url: thumbnailUrl },
        imageUrl,
      ).map((url) => withCacheBust(url, cacheBust)),
    [imageUrl, thumbnailUrl, cacheBust],
  );
  const candidatesKey = candidates.join('|');
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setIndex(0);
    setExhausted(false);
  }, [candidatesKey]);

  const src = !exhausted && candidates.length > 0 ? candidates[index] : null;
  const placeholderSrc = resolveStudentGenderPlaceholder(gender);

  function handleError() {
    if (index + 1 < candidates.length) {
      setIndex((current) => current + 1);
      return;
    }
    setExhausted(true);
  }

  return (
    <div className={className}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={photoAlt ?? displayName}
          className={imageClassName}
          loading="lazy"
          decoding="async"
          onError={handleError}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={placeholderSrc}
          alt=""
          role="presentation"
          aria-label={placeholderAriaLabel}
          className={placeholderClassName ?? imageClassName}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
