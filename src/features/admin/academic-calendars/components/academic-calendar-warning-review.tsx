'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Card } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import type { Locale } from '@/lib/i18n/config';
import type { AcademicCalendarDetail } from '@/types/academic-calendar';
import {
  groupAcademicCalendarWarnings,
  type AcademicCalendarWarningLevel,
  type AcademicCalendarWarningReviewItem,
} from '@/features/admin/academic-calendars/utils/academic-calendar-warning-review';
import '@/features/admin/academic-calendars/academic-calendar-warning-review.css';

type WarningReviewCopy = {
  title: string;
  subtitle: string;
  noBlockers: string;
  blocker: string;
  warning: string;
  info: string;
  overlap: string;
  outsideOperationalRange: string;
  generic: string;
  originalDetail: string;
  studyDays: string;
  backendDecision: string;
  repeated: string;
};

const COPY: Record<Locale, WarningReviewCopy> = {
  ar: {
    title: 'مراجعة التنبيهات',
    subtitle: 'جُمعت الملاحظات المتكررة حسب أثرها حتى تظهر المشاكل الحقيقية بوضوح.',
    noBlockers: 'لا توجد موانع ضمن التحذيرات الحالية',
    blocker: 'مانع',
    warning: 'تنبيه',
    info: 'معلومة',
    overlap: 'يوجد تداخل زمني مع حدث آخر. هذا تنبيه للمراجعة ولا يعني وحده وجود خطأ يمنع النشر.',
    outsideOperationalRange: 'حدث رسمي خارج النطاق التشغيلي المعتاد للسنة الدراسية. يبقى محفوظًا كما ورد في المرجع التنظيمي ولا يُعرض كخطأ في المقرر.',
    generic: 'ملاحظة واردة من النظام تحتاج مراجعة ضمن سياق التقويم.',
    originalDetail: 'التفصيل الأصلي',
    studyDays: 'عدد أيام الدراسة غير موثوق حاليًا بسبب عناصر تقويمية تحتاج مراجعة؛ لا تعتمد هذا الرقم وحده لاتخاذ قرار.',
    backendDecision: 'جاهزية النشر النهائية تبقى وفق حالة التقويم و`allowed_actions` القادمة من Backend.',
    repeated: 'مرات',
  },
  en: {
    title: 'Review notices',
    subtitle: 'Repeated notices are grouped by impact so real blockers remain clear.',
    noBlockers: 'No blockers are present in the current warnings',
    blocker: 'Blocker',
    warning: 'Notice',
    info: 'Information',
    overlap: 'This event overlaps another event. Review it, but an overlap alone does not mean publishing is blocked.',
    outsideOperationalRange: 'This official event is outside the usual operational range of the school year. It remains part of the regulatory reference and is not presented as a curriculum error.',
    generic: 'The system returned a notice that should be reviewed in the calendar context.',
    originalDetail: 'Original detail',
    studyDays: 'The study-day count is currently unreliable because calendar items still require review; do not use this number alone for a decision.',
    backendDecision: 'Final publish readiness still follows the calendar state and Backend `allowed_actions`.',
    repeated: 'times',
  },
  fr: {
    title: 'Révision des alertes',
    subtitle: 'Les alertes répétées sont regroupées par impact afin de distinguer clairement les vrais blocages.',
    noBlockers: 'Aucun blocage n’apparaît dans les alertes actuelles',
    blocker: 'Blocage',
    warning: 'Alerte',
    info: 'Information',
    overlap: 'Cet événement chevauche un autre événement. Il doit être vérifié, mais un chevauchement seul ne signifie pas que la publication est bloquée.',
    outsideOperationalRange: 'Cet événement officiel se situe hors de la plage opérationnelle habituelle de l’année scolaire. Il reste conservé comme élément de la référence réglementaire et n’est pas présenté comme une erreur du programme.',
    generic: 'Le système a retourné une alerte à vérifier dans le contexte du calendrier.',
    originalDetail: 'Détail original',
    studyDays: 'Le nombre de jours d’étude n’est pas fiable actuellement car certains éléments du calendrier doivent encore être vérifiés ; ne l’utilisez pas seul pour décider.',
    backendDecision: 'La décision finale de publication reste déterminée par l’état du calendrier et les `allowed_actions` du Backend.',
    repeated: 'fois',
  },
  es: {
    title: 'Revisión de avisos',
    subtitle: 'Los avisos repetidos se agrupan por impacto para que los bloqueos reales queden claros.',
    noBlockers: 'No hay bloqueos en los avisos actuales',
    blocker: 'Bloqueo',
    warning: 'Aviso',
    info: 'Información',
    overlap: 'Este evento se solapa con otro. Debe revisarse, pero un solapamiento por sí solo no significa que la publicación esté bloqueada.',
    outsideOperationalRange: 'Este evento oficial está fuera del rango operativo habitual del curso escolar. Se conserva como parte de la referencia normativa y no se presenta como un error del currículo.',
    generic: 'El sistema devolvió un aviso que debe revisarse en el contexto del calendario.',
    originalDetail: 'Detalle original',
    studyDays: 'El número de días lectivos no es fiable actualmente porque hay elementos del calendario pendientes de revisión; no use este valor por sí solo para decidir.',
    backendDecision: 'La disponibilidad final para publicar sigue dependiendo del estado del calendario y de los `allowed_actions` del Backend.',
    repeated: 'veces',
  },
};

function itemCopy(item: AcademicCalendarWarningReviewItem, copy: WarningReviewCopy): string {
  if (item.kind === 'overlap') return copy.overlap;
  if (item.kind === 'outside_operational_range') return copy.outsideOperationalRange;
  return copy.generic;
}

function levelLabel(level: AcademicCalendarWarningLevel, copy: WarningReviewCopy): string {
  if (level === 'blocker') return copy.blocker;
  if (level === 'info') return copy.info;
  return copy.warning;
}

function levelTone(level: AcademicCalendarWarningLevel): 'red' | 'amber' | 'blue' {
  if (level === 'blocker') return 'red';
  if (level === 'info') return 'blue';
  return 'amber';
}

function WarningGroup({
  level,
  items,
  copy,
  extraStudyDays,
}: {
  level: AcademicCalendarWarningLevel;
  items: AcademicCalendarWarningReviewItem[];
  copy: WarningReviewCopy;
  extraStudyDays?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0) + (extraStudyDays ? 1 : 0);
  if (total === 0) return null;

  return (
    <details className="academic-calendar-warning-review__group" open={level === 'blocker'}>
      <summary className="academic-calendar-warning-review__group-summary">
        <span>{levelLabel(level, copy)}</span>
        <Badge tone={levelTone(level)}>{total}</Badge>
      </summary>
      <div className="academic-calendar-warning-review__list">
        {extraStudyDays ? (
          <div className="academic-calendar-warning-review__item">
            <div className="academic-calendar-warning-review__item-head">
              <Badge tone="amber">{copy.warning}</Badge>
            </div>
            <p>{copy.studyDays}</p>
          </div>
        ) : null}
        {items.map((item, index) => (
          <div
            className="academic-calendar-warning-review__item"
            key={`${item.level}-${item.kind}-${item.warning.code ?? index}-${item.warning.message}`}
          >
            <div className="academic-calendar-warning-review__item-head">
              <Badge tone={levelTone(item.level)}>{levelLabel(item.level, copy)}</Badge>
              {item.count > 1 ? (
                <span className="muted tiny" dir="auto">
                  × {item.count} {copy.repeated}
                </span>
              ) : null}
              {item.warning.code ? <code dir="ltr">{item.warning.code}</code> : null}
            </div>
            <p>{itemCopy(item, copy)}</p>
            {item.kind === 'generic' && item.warning.message ? (
              <p className="academic-calendar-warning-review__original" dir="auto">
                <span>{copy.originalDetail}: </span>
                {item.warning.message}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function WarningReviewCard({
  copy,
  blockers,
  reviewWarnings,
  information,
  studyDaysUnreliable,
}: {
  copy: WarningReviewCopy;
  blockers: AcademicCalendarWarningReviewItem[];
  reviewWarnings: AcademicCalendarWarningReviewItem[];
  information: AcademicCalendarWarningReviewItem[];
  studyDaysUnreliable: boolean;
}) {
  return (
    <Card className="academic-calendar-warning-review">
      <div className="academic-calendar-warning-review__head">
        <div>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.subtitle}</p>
        </div>
        <div className="academic-calendar-warning-review__counts" aria-label={copy.title}>
          <Badge tone="red">
            {copy.blocker}: {blockers.reduce((sum, item) => sum + item.count, 0)}
          </Badge>
          <Badge tone="amber">
            {copy.warning}:{' '}
            {reviewWarnings.reduce((sum, item) => sum + item.count, 0) +
              (studyDaysUnreliable ? 1 : 0)}
          </Badge>
          <Badge tone="blue">
            {copy.info}: {information.reduce((sum, item) => sum + item.count, 0)}
          </Badge>
        </div>
      </div>

      {blockers.length === 0 ? (
        <div className="academic-calendar-warning-review__clear">
          <strong>{copy.noBlockers}</strong>
          <span>{copy.backendDecision}</span>
        </div>
      ) : null}

      <div className="academic-calendar-warning-review__groups">
        <WarningGroup level="blocker" items={blockers} copy={copy} />
        <WarningGroup
          level="warning"
          items={reviewWarnings}
          copy={copy}
          extraStudyDays={studyDaysUnreliable}
        />
        <WarningGroup level="info" items={information} copy={copy} />
      </div>
    </Card>
  );
}

export function AcademicCalendarWarningReview({ calendar }: { calendar: AcademicCalendarDetail }) {
  const { locale } = useLocale();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const copy = COPY[locale];
  const items = groupAcademicCalendarWarnings(calendar.warnings ?? calendar.summary?.warnings ?? []);
  const studyDaysUnreliable = calendar.summary?.study_day_count_reliable === false;

  const blockers = items.filter((item) => item.level === 'blocker');
  const reviewWarnings = items.filter((item) => item.level === 'warning');
  const information = items.filter((item) => item.level === 'info');
  const total = items.reduce((sum, item) => sum + item.count, 0) + (studyDaysUnreliable ? 1 : 0);

  useEffect(() => {
    if (total === 0) {
      setPortalTarget(null);
      return;
    }

    const detailRoot = document.querySelector<HTMLElement>('.academic-calendar-detail');
    const headerMeta = detailRoot?.querySelector<HTMLElement>('.academic-calendar-detail__header-meta');
    if (!detailRoot || !headerMeta) return;

    const host = document.createElement('div');
    host.className = 'academic-calendar-warning-review__host';
    headerMeta.insertAdjacentElement('afterend', host);
    setPortalTarget(host);

    return () => {
      setPortalTarget(null);
      host.remove();
    };
  }, [calendar.id, total]);

  if (total === 0 || !portalTarget) return null;

  return createPortal(
    <WarningReviewCard
      copy={copy}
      blockers={blockers}
      reviewWarnings={reviewWarnings}
      information={information}
      studyDaysUnreliable={studyDaysUnreliable}
    />,
    portalTarget,
  );
}
