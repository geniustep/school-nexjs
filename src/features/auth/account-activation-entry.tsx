'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';
import { AccountActivationForm } from './account-activation-form';
import { AccountActivationLinkForm } from './account-activation-link-form';

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getHash() {
  return window.location.hash;
}

function getServerHash() {
  return '';
}

export function AccountActivationEntry({ branding }: { branding: LoginSchoolBrandingView }) {
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const captured = useRef<{ requested: boolean; token: string } | null>(null);

  if (captured.current === null && hash.startsWith('#token=')) {
    captured.current = { requested: true, token: hash.slice('#token='.length) };
  }

  const linkRequest = captured.current;

  useEffect(() => {
    if (!linkRequest?.requested || window.location.hash === '') return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, [linkRequest]);

  if (linkRequest?.requested) {
    return <AccountActivationLinkForm branding={branding} token={linkRequest.token} />;
  }
  return <AccountActivationForm branding={branding} />;
}
