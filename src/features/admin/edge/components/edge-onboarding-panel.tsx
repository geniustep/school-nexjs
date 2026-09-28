'use client';

import { useRef, useState } from 'react';
import { createEdgePairingGrant, fetchEdgeDevices } from '@/features/admin/edge/api/client';
import type { EdgeDevice, EdgeOnboardingState } from '@/features/admin/edge/types';
import {
  EDGE_ONBOARDING_POLL_MS,
  EDGE_ONBOARDING_TIMEOUT_MS,
  edgePairingGrantExpired,
  hasNewConnectedEdgeDevice,
} from '@/features/admin/edge/utils/edge-onboarding';

const LOCAL_AGENT_ENROLL_URL = 'http://127.0.0.1:8787/api/onboarding/enroll';

function handoffId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function EdgeOnboardingPanel({
  devices,
  locale,
  onConnected,
}: {
  devices: EdgeDevice[];
  locale: string;
  onConnected: () => Promise<void> | void;
}) {
  const [state, setState] = useState<EdgeOnboardingState>('idle');
  const runRef = useRef(0);
  const fr = locale === 'fr';

  async function start() {
    const run = ++runRef.current;
    setState('creating_grant');

    const grant = await createEdgePairingGrant();
    if (run !== runRef.current) return;
    if (!grant.success) {
      setState('error');
      return;
    }

    if (edgePairingGrantExpired(grant.data.expires_at)) {
      setState('expired');
      return;
    }

    setState('contacting_agent');
    try {
      const response = await fetch(LOCAL_AGENT_ENROLL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          pairing_code: grant.data.pairing_code,
          expires_at: grant.data.expires_at,
          contract_version: grant.data.contract_version,
          cloud_base_url: grant.data.cloud_base_url,
          handoff_id: handoffId(),
        }),
      });
      if (!response.ok) {
        setState('agent_unreachable');
        return;
      }
    } catch {
      setState('agent_unreachable');
      return;
    }

    setState('waiting_for_device');
    const deadline = Date.now() + EDGE_ONBOARDING_TIMEOUT_MS;
    while (run === runRef.current && Date.now() < deadline) {
      if (edgePairingGrantExpired(grant.data.expires_at)) {
        setState('expired');
        return;
      }
      const result = await fetchEdgeDevices();
      if (result.success && hasNewConnectedEdgeDevice(devices, result.data.devices)) {
        setState('connected');
        await onConnected();
        return;
      }
      await sleep(EDGE_ONBOARDING_POLL_MS);
    }
    if (run === runRef.current) setState('error');
  }

  const busy = ['creating_grant', 'contacting_agent', 'waiting_for_device'].includes(state);
  const label = fr ? 'Lier un appareil Raqeem Edge' : 'ربط جهاز Raqeem Edge';

  return (
    <div className="edge-onboarding">
      <div>
        <strong>{fr ? 'Connexion de Raqeem Edge' : 'ربط Raqeem Edge'}</strong>
        <p>
          {state === 'agent_unreachable'
            ? fr
              ? 'Raqeem Edge Agent est introuvable sur cet ordinateur. Installez-le ou ouvrez cette page depuis l’ordinateur de la sonnerie, puis réessayez.'
              : 'لم يتم العثور على Raqeem Edge Agent على هذا الحاسوب. ثبّته أو افتح هذه الصفحة من حاسوب الجرس ثم أعد المحاولة.'
            : state === 'waiting_for_device'
              ? fr
                ? 'L’agent a reçu la demande. Confirmation de la liaison avec l’établissement…'
                : 'استلم الوكيل طلب الربط. جارٍ تأكيد ارتباط الجهاز بالمؤسسة…'
              : state === 'connected'
                ? fr
                  ? 'Appareil lié et connexion confirmée par le serveur.'
                  : 'تم ربط الجهاز وتأكيد الاتصال من الخادم.'
                : state === 'expired'
                  ? fr
                    ? 'La demande de liaison a expiré. Relancez la connexion pour obtenir un nouveau code.'
                    : 'انتهت صلاحية طلب الربط. أعد المحاولة لإنشاء رمز جديد.'
                  : state === 'error'
                    ? fr
                      ? 'La liaison n’a pas pu être confirmée. Vérifiez l’agent puis réessayez.'
                      : 'تعذر تأكيد الربط. تحقق من الوكيل ثم أعد المحاولة.'
                    : fr
                      ? 'Effectuez cette étape depuis l’ordinateur Windows qui exécutera la sonnerie.'
                      : 'نفّذ هذه الخطوة من حاسوب Windows الذي سيشغّل الجرس.'}
        </p>
      </div>
      <button type="button" className="btn btn--primary" disabled={busy || state === 'connected'} onClick={() => void start()}>
        {busy
          ? fr
            ? 'Connexion…'
            : 'جارٍ الربط…'
          : state === 'connected'
            ? fr
              ? 'Connecté'
              : 'متصل'
            : label}
      </button>
    </div>
  );
}
