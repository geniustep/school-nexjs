'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminStaffLatestAnnouncements } from './admin-staff-latest-announcements';

export function AdminStaffLatestAnnouncementsBridge() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const legacy = document.querySelector<HTMLElement>('.admin-section--messages');
    if (!legacy) return;

    const mount = document.createElement('div');
    mount.dataset.adminStaffLatestAnnouncementsMount = 'true';
    legacy.insertAdjacentElement('beforebegin', mount);
    legacy.hidden = true;
    setTarget(mount);

    return () => {
      legacy.hidden = false;
      mount.remove();
      setTarget(null);
    };
  }, []);

  return target ? createPortal(<AdminStaffLatestAnnouncements />, target) : null;
}
