'use client';

/**
 * Displays backend-computed delivery readiness. Never recomputes
 * ready_for_confirmation locally — it is always trusted from the payload.
 */

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { DeliveryReadiness } from '@/types/teaching-delivery';
import '@/features/teacher/delivery/delivery.css';

const FLAG_KEYS = [
  'occurrence_ready',
  'occurrence_finished',
  'assignment_ready',
  'offering_ready',
  'distribution_ready',
  'delivered_line_ready',
  'completion_ready',
  'content_ready',
  'duration_valid',
  'deviation_ready',
] as const;

export function DeliveryReadinessPanel({
  readiness,
  blockers = [],
  warnings = [],
}: {
  readiness?: DeliveryReadiness | null;
  blockers?: string[];
  warnings?: string[];
}) {
  const t = useT();
  if (!readiness && blockers.length === 0 && warnings.length === 0) return null;

  return (
    <section className="delivery-readiness card stack" aria-label={t('teacher.delivery.readiness.title')}>
      <div className="between">
        <h3>{t('teacher.delivery.readiness.title')}</h3>
        {readiness && (
          <Badge tone={readiness.ready_for_confirmation ? 'green' : 'amber'}>
            {readiness.ready_for_confirmation
              ? t('teacher.delivery.readiness.ready')
              : t('teacher.delivery.readiness.notReady')}
          </Badge>
        )}
      </div>
      {readiness && (
        <div className="delivery-readiness__flags">
          {FLAG_KEYS.filter((key) => readiness[key] !== undefined).map((key) => (
            <span
              key={key}
              className={
                readiness[key]
                  ? 'delivery-readiness__flag delivery-readiness__flag--ok'
                  : 'delivery-readiness__flag delivery-readiness__flag--pending'
              }
            >
              {readiness[key] ? '✓' : '•'} {t(`teacher.delivery.readiness.flag.${key}`)}
            </span>
          ))}
        </div>
      )}
      {blockers.map((item) => (
        <p className="alert alert--danger" key={item}>{item}</p>
      ))}
      {warnings.map((item) => (
        <p className="alert alert--warning" key={item}>{item}</p>
      ))}
    </section>
  );
}
