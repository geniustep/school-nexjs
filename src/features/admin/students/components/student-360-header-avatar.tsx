'use client';

import { useEffect, useMemo, useState } from 'react';
import { initials } from '@/lib/utils/format';
import { resolveStudentPhotoCandidates } from '../utils/resolve-student-photo-url';
import type { StudentOverviewPhoto } from '@/types/student-overview';

export function Student360HeaderAvatar({
  photo,
  legacyImageUrl,
  displayName,
}: {
  photo?: StudentOverviewPhoto | null;
  legacyImageUrl?: string | null;
  displayName: string;
}) {
  const candidates = useMemo(
    () => resolveStudentPhotoCandidates(photo, legacyImageUrl),
    [photo, legacyImageUrl],
  );
  const candidatesKey = candidates.join('|');
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setIndex(0);
    setExhausted(false);
  }, [candidatesKey]);

  const src = !exhausted && candidates.length > 0 ? candidates[index] : null;
  const avatarInitials = initials(displayName);

  function handleError() {
    if (index + 1 < candidates.length) {
      setIndex((current) => current + 1);
      return;
    }
    setExhausted(true);
  }

  return (
    <div
      className={`student-360-header__avatar${src ? ' student-360-header__avatar--photo' : ''}`}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="student-360-header__avatar-img"
          loading="lazy"
          decoding="async"
          onError={handleError}
        />
      ) : (
        avatarInitials
      )}
    </div>
  );
}
