'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessDomain, SetupReadinessPayload } from '@/types/academic-setup';
import { isStaffDomainUnavailable, readinessStatusLabel } from '../utils/readiness-present';

type DomainKey = 'levels_classes' | 'subjects_tracks' | 'teachers' | 'staff' | 'assignments';

const DOMAIN_META: { key: DomainKey; href: string; icon: string; titleKey: string; featured?: boolean }[] = [
  { key: 'levels_classes', href: '/admin/settings/academic-setup/classes', icon: '🏫', titleKey: 'classes' },
  { key: 'subjects_tracks', href: '/admin/settings/academic-setup/subjects', icon: '📖', titleKey: 'subjects' },
  { key: 'teachers', href: '/admin/settings/academic-setup/teachers', icon: '👩‍🏫', titleKey: 'teachers' },
  { key: 'staff', href: '/admin/settings/academic-setup/staff', icon: '🧑‍💼', titleKey: 'staff' },
  {
    key: 'assignments',
    href: '/admin/settings/academic-setup/assignments',
    icon: '📋',
    titleKey: 'assignments',
    featured: true,
  },
];

function domainStats(
  key: DomainKey,
  domain: SetupReadinessDomain | undefined,
  t: (k: string, p?: Record<string, string | number>) => string,
  staffUnavailable: boolean,
) {
  if (key === 'staff' && staffUnavailable) {
    return <span>{t('admin.academicSetup.staffDomainUnavailable')}</span>;
  }
  if (!domain) return <span>{t('common.dash')}</span>;
  const s = domain.summary;
  switch (key) {
    case 'levels_classes':
      return (
        <>
          <span>{t('admin.academicSetup.cards.levelsCount', { count: s.levels ?? 0 })}</span>
          <span>{t('admin.academicSetup.cards.classesCount', { count: s.classes ?? 0 })}</span>
        </>
      );
    case 'subjects_tracks':
      return (
        <>
          <span>{t('admin.academicSetup.cards.subjectsCount', { count: s.subjects ?? 0 })}</span>
          <span>{t('admin.academicSetup.cards.tracksCount', { count: s.tracks ?? 0 })}</span>
        </>
      );
    case 'teachers':
      return (
        <>
          <span>{t('admin.academicSetup.cards.teachersCount', { count: s.teachers ?? 0 })}</span>
          {(s.without_assignments ?? 0) > 0 && (
            <strong>{t('admin.academicSetup.cards.noAssignments', { count: s.without_assignments })}</strong>
          )}
        </>
      );
    case 'staff':
      return (
        <span>{t('admin.academicSetup.cards.staffCount', { count: s.staff ?? 0 })}</span>
      );
    case 'assignments':
      return (
        <>
          <span>{t('admin.academicSetup.cards.assignmentsCount', { count: s.assigned ?? 0 })}</span>
          {(s.missing ?? 0) > 0 && (
            <strong>{t('admin.academicSetup.cards.missingTeachers', { count: s.missing })}</strong>
          )}
        </>
      );
    default:
      return null;
  }
}

export function SetupDomainCards({ data }: { data: SetupReadinessPayload }) {
  const t = useT();
  const staffUnavailable = isStaffDomainUnavailable(data.domains);

  return (
    <div className="academic-setup-cards">
      {DOMAIN_META.map(({ key, href, icon, titleKey, featured }) => {
        const domain = data.domains[key];
        return (
          <Link
            key={key}
            href={href}
            className={cn('academic-setup-card', featured && 'academic-setup-card--featured')}
          >
            <span aria-hidden>{icon}</span>
            <strong>{t(`admin.academicSetup.cards.${titleKey}`)}</strong>
            {domain && (
              <span className="tiny muted">
                {readinessStatusLabel(domain.status, t)} · {domain.score}%
              </span>
            )}
            <div className="academic-setup-card__stats">
              {domainStats(key, domain, t, staffUnavailable)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
