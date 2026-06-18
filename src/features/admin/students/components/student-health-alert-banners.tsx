'use client';

import { useT } from '@/features/i18n/locale-context';
import { CRITICAL_ITEM_LABEL_KEYS } from '../utils/normalize-student-health';
import type { CriticalHealthItem } from '@/types/student-360';

export function StudentHealthAlertBanners({
  showCritical,
  showWarning,
  showCalm,
  criticalItems,
}: {
  showCritical: boolean;
  showWarning: boolean;
  showCalm: boolean;
  criticalItems: CriticalHealthItem[];
}) {
  const t = useT();

  if (showCritical) {
    return (
      <section
        id="student-health-critical"
        className="student-health-critical"
        role="alert"
        aria-labelledby="student-health-critical-title"
      >
        <header className="student-health-critical__head">
          <span className="student-health-critical__glyph" aria-hidden="true">
            ⚠
          </span>
          <div>
            <h2 id="student-health-critical-title" className="student-health-critical__title">
              {t('admin.student360.health.criticalAlert')}
            </h2>
            <p className="student-health-critical__desc">{t('admin.student360.health.attentionNeeded')}</p>
          </div>
        </header>

        {criticalItems.length > 0 ? (
          <ul className="student-health-critical__list">
            {criticalItems.map((item, index) => {
              const label =
                item.label ||
                (item.key ? t(CRITICAL_ITEM_LABEL_KEYS[item.key] ?? item.key) : t('admin.student360.health.title'));
              return (
                <li key={`${item.key ?? label}-${index}`} className="student-health-critical__item">
                  <span className="student-health-critical__item-label">{label}</span>
                  {item.description ? (
                    <p className="student-health-critical__item-value" dir="auto">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    );
  }

  if (showWarning) {
    return (
      <section className="student-health-warning" role="status">
        <span className="student-health-warning__glyph" aria-hidden="true">
          ◔
        </span>
        <p className="student-health-warning__text">{t('admin.student360.health.warningAlert')}</p>
      </section>
    );
  }

  if (showCalm) {
    return (
      <section className="student-health-calm" role="status">
        <span className="student-health-calm__glyph" aria-hidden="true">
          ✓
        </span>
        <p className="student-health-calm__text">{t('admin.student360.health.noCriticalAlerts')}</p>
      </section>
    );
  }

  return null;
}
