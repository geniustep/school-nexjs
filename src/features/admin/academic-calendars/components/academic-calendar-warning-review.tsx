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
    subtitle: 'تظهر هنا فقط الملاحظات التي تساعدك على فهم مشكلة حقيقية أو اتخاذ قرار.',
    noBlockers: 'لا توجد موانع ضمن التحذيرات الحالية',
    blocker: 'مانع',
    warning: 'تنبيه',
    info: 'معلومة',
    overlap: 'يوجد تداخل زمني صنّفه النظام كمشكلة مانعة. راجع التفصيل الأصلي قبل المتابعة.',
    outsideOperationalRange: 'حدث رسمي خارج النطاق التشغيلي المعتاد للسنة الدراسية. يبقى محفوظًا كما ورد في المرجع التنظيمي ولا يُعرض كخطأ في المقرر.',
    generic: 'ملاحظة محددة واردة من النظام تحتاج مراجعة ضمن سياق التقويم.',
    originalDetail: 'التفصيل الأصلي',
    studyDays: 'عدد أيام الدراسة غير موثوق حاليًا؛ لا تعتمد هذا الرقم وحده لاتخاذ قرار.',
    backendDecision: 'تظل إمكانية النشر مرتبطة بحالة التقويم والصلاحيات المتاحة.',
    repeated: 'مرات',
  },
  en: {
    title: 'Review notices',
    subtitle: 'Only notices that help you understand a real issue or make a decision are shown here.',
    noBlockers: 'No blockers are present in the current warnings',
    blocker: 'Blocker',
    warning: 'Notice',
    info: 'Information',
    overlap: 'The system classified this overlap as a blocking issue. Review the original detail before continuing.',
    outsideOperationalRange: 'This official event is outside the usual operational range of the school year. It remains part of the regulatory reference and is not presented as a curriculum error.',
    generic: 'The system returned a specific notice that should be reviewed in the calendar context.',
    originalDetail: 'Original detail',
    studyDays: 'The study-day count is currently unreliable; do not use this number alone for a decision.',
    backendDecision: 'Publish availability still depends on the calendar state and the actions available to you.',
    repeated: 'times',
  },
  fr: {
    title: 'Révision des alertes',
    subtitle: 'Seules les alertes qui aident à comprendre un problème réel ou à prendre une décision sont affichées ici.',
    noBlockers: 'Aucun blocage n’apparaît dans les alertes actuelles',
    blocker: 'Blocage',
    warning: 'Alerte',
    info: 'Information',
    overlap: 'Le système a classé ce chevauchement comme bloquant. Vérifiez le détail d’origine avant de continuer.',
    outsideOperationalRange: 'Cet événement officiel se situe hors de la plage opérationnelle habituelle de l’année scolaire. Il reste conservé comme élément de la référence réglementaire et n’est pas présenté comme une erreur du programme.',
    generic: 'Le système a retourné une alerte précise à vérifier dans le contexte du calendrier.',
    originalDetail: 'Détail original',
    studyDays: 'Le nombre de jours d’étude n’est pas fiable actuellement ; ne l’utilisez pas seul pour décider.',
    backendDecision: 'La possibilité de publier dépend toujours de l’état du calendrier et des actions qui vous sont disponibles.',
    repeated: 'fois',
  },
  es: {
    title: 'Revisión de avisos',
    subtitle: 'Aquí solo se muestran avisos que ayudan a entender un problema real o a tomar una decisión.',
    noBlockers: 'No hay bloqueos en los avisos actuales',
    blocker: 'Bloqueo',
    warning: 'Aviso',
    info: 'Información',
    overlap: 'El sistema clasificó este solapamiento como un problema bloqueante. Revise el detalle original antes de continuar.',
    outsideOperationalRange: 'Este evento oficial está fuera del rango operativo habitual del curso escolar. Se conserva como parte de la referencia normativa y no se presenta como un error del currículo.',
    generic: 'El sistema devolvió un aviso específico que debe revisarse en el contexto del calendario.',
    originalDetail: 'Detalle original',
    studyDays: 'El número de días lectivos no es fiable actualmente; no use este valor por sí solo para decidir.',
    backendDecision: 'La posibilidad de publicar sigue dependiendo del estado del calendario y de las acciones disponibles para usted.',
    repeated: 'veces',
  },
};

function itemCopy(item: AcademicCalendarWarningReviewItem, copy: WarningReviewCopy): string {
  if (item.kind === 'overlap') {
    if (item.level === 'blocker' && item.warning.message) return item.warning.message;
    return copy.overlap;
  }
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
              <Badge tone={levelTone(level)}>{levelLabel(level, copy)}</Badge>
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
  const blockerCount = blockers.reduce((sum, item) => sum + item.count, 0);
  const warningCount = reviewWarnings.reduce((sum, item) => sum + item.count, 0);
  const infoCount =
    information.reduce((sum, item) => sum + item.count, 0) + (studyDaysUnreliable ? 1 : 0);

  return (
    <Card className="academic-calendar-warning-review">
      <div className="academic-calendar-warning-review__head">
        <div>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.subtitle}</p>
        </div>
        <div className="academic-calendar-warning-review__counts" aria-label={copy.title}>
          <Badge tone="red">
            {copy.blocker}: {blockerCount}
          </Badge>
          {warningCount > 0 ? (
            <Badge tone="amber">
              {copy.warning}: {warningCount}
            </Badge>
          ) : null}
          {infoCount > 0 ? (
            <Badge tone="blue">
              {copy.info}: {infoCount}
            </Badge>
          ) : null}
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
        <WarningGroup level="warning" items={reviewWarnings} copy={copy} />
        <WarningGroup
          level="info"
          items={information}
          copy={copy}
          extraStudyDays={studyDaysUnreliable}
        />
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
