'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import type { SetupSummaryCounts } from '../types';

type CardDef = {
  href: string;
  icon: string;
  titleKey: string;
  featured?: boolean;
  stats: (s: SetupSummaryCounts, t: (k: string, p?: Record<string, string | number>) => string) => React.ReactNode;
};

const CARDS: CardDef[] = [
  {
    href: '/admin/settings/academic-setup/classes',
    icon: '🏫',
    titleKey: 'classes',
    stats: (s, t) => (
      <>
        <span>{t('admin.academicSetup.cards.levelsCount', { count: s.levels })}</span>
        <span>{t('admin.academicSetup.cards.classesCount', { count: s.classes })}</span>
        {s.classesNeedReview > 0 && (
          <strong>{t('admin.academicSetup.cards.needReview', { count: s.classesNeedReview })}</strong>
        )}
      </>
    ),
  },
  {
    href: '/admin/settings/academic-setup/subjects',
    icon: '📖',
    titleKey: 'subjects',
    stats: (s, t) => (
      <>
        <span>{t('admin.academicSetup.cards.subjectsCount', { count: s.activeSubjects })}</span>
        {s.unlinkedSubjects > 0 && (
          <strong>{t('admin.academicSetup.cards.unlinkedSubjects', { count: s.unlinkedSubjects })}</strong>
        )}
      </>
    ),
  },
  {
    href: '/admin/settings/academic-setup/teachers',
    icon: '👩‍🏫',
    titleKey: 'teachers',
    stats: (s, t) => (
      <>
        <span>{t('admin.academicSetup.cards.teachersCount', { count: s.teachers })}</span>
        <span>{t('admin.academicSetup.cards.activeTeachers', { count: s.activeTeachers })}</span>
        {s.teachersWithoutAssignments > 0 && (
          <strong>{t('admin.academicSetup.cards.noAssignments', { count: s.teachersWithoutAssignments })}</strong>
        )}
      </>
    ),
  },
  {
    href: '/admin/settings/academic-setup/staff',
    icon: '🧑‍💼',
    titleKey: 'staff',
    stats: (_s, t) => <span>{t('admin.academicSetup.cards.staffGap')}</span>,
  },
  {
    href: '/admin/settings/academic-setup/assignments',
    icon: '📋',
    titleKey: 'assignments',
    featured: true,
    stats: (s, t) => (
      <>
        <span>{t('admin.academicSetup.cards.assignmentsCount', { count: s.assignments })}</span>
        {s.subjectsWithoutTeacher > 0 && (
          <strong>{t('admin.academicSetup.cards.missingTeachers', { count: s.subjectsWithoutTeacher })}</strong>
        )}
        {s.highLoadTeachers > 0 && (
          <span>{t('admin.academicSetup.cards.highLoad', { count: s.highLoadTeachers })}</span>
        )}
      </>
    ),
  },
];

export function SetupSummaryCards({ summary }: { summary: SetupSummaryCounts }) {
  const t = useT();

  return (
    <div className="academic-setup-cards">
      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={cn('academic-setup-card', card.featured && 'academic-setup-card--featured')}
        >
          <span aria-hidden>{card.icon}</span>
          <strong>{t(`admin.academicSetup.cards.${card.titleKey}`)}</strong>
          <div className="academic-setup-card__stats">{card.stats(summary, t)}</div>
        </Link>
      ))}
    </div>
  );
}
