'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Student → family recipient candidates → existing ChannelChat composer.
 * No channel creation. No send until user submits inside ChannelChat.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { useStudentDetails } from '@/features/admin/students/hooks/use-student-details';
import { useT } from '@/features/i18n/locale-context';
import { channelTypeLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ChannelRecipientCandidate } from '@/types/channel-recipient-candidates';
import { ChannelChat } from './channel-chat';
import { useChannelRecipientCandidates } from './hooks/use-channel-recipient-candidates';
import { parseChannelComposeStudentId } from './utils/parse-channel-compose-student-id';

function studentIdentityNames(student: {
  name_ar?: string | null;
  name_latin?: string | null;
  full_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): { arabic: string; latin: string | null } {
  const arabic =
    student.name_ar?.trim() ||
    student.full_name?.trim() ||
    getStudentDisplayName(student);
  const latin = student.name_latin?.trim() || null;
  return { arabic: arabic === '—' ? '' : arabic, latin };
}

function emptyReasonKey(
  reason: string | null | undefined,
):
  | 'channels.compose.noLinkedGuardianUsers'
  | 'channels.compose.noRelatedChannels'
  | 'channels.compose.noSafeFamilyChannel'
  | 'channels.compose.noRelatedChannels' {
  if (reason === 'no_linked_guardian_users') return 'channels.compose.noLinkedGuardianUsers';
  if (reason === 'no_safe_family_channel') return 'channels.compose.noSafeFamilyChannel';
  return 'channels.compose.noRelatedChannels';
}

export function StudentChannelComposeWorkspace() {
  const t = useT();
  const searchParams = useSearchParams();
  const parsed = useMemo(
    () => parseChannelComposeStudentId(searchParams),
    [searchParams],
  );

  const studentId = parsed.ok ? parsed.studentId : null;
  const studentState = useStudentDetails(studentId);
  const candidatesState = useChannelRecipientCandidates(studentId);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);

  const channels = candidatesState.data?.channels ?? [];

  useEffect(() => {
    setSelectedChannelId(null);
  }, [studentId]);

  useEffect(() => {
    if (channels.length === 1) {
      setSelectedChannelId(channels[0].id);
      return;
    }
    if (channels.length === 0) {
      setSelectedChannelId(null);
    }
  }, [channels]);

  if (!parsed.ok) {
    return (
      <div className="admin-workspace">
        <PageHeader title={t('channels.compose.title')} />
        <EmptyState
          icon="✉"
          title={t('channels.compose.invalidStudentIdTitle')}
          description={t('channels.compose.invalidStudentIdDesc')}
          action={
            <Link href="/admin/channels" className="btn btn--ghost btn--sm">
              {t('channels.compose.openChannels')}
            </Link>
          }
        />
      </div>
    );
  }

  const identity = studentState.data
    ? studentIdentityNames(studentState.data.student)
    : null;
  const profileHref = `/admin/students/${parsed.studentId}`;

  function renderNavLinks() {
    return (
      <div className="wrap-gap" style={{ marginBlockStart: 12 }}>
        <Link href={profileHref} className="btn btn--ghost btn--sm">
          {t('channels.compose.openStudentProfile')}
        </Link>
        <Link href="/admin/channels" className="btn btn--ghost btn--sm">
          {t('channels.compose.openChannels')}
        </Link>
      </div>
    );
  }

  function onChannelSelectChange(nextRaw: string) {
    if (!nextRaw) {
      setSelectedChannelId(null);
      return;
    }
    const nextId = Number(nextRaw);
    if (!Number.isInteger(nextId) || nextId <= 0) return;
    if (selectedChannelId != null && selectedChannelId !== nextId) {
      const confirmed = window.confirm(t('channels.compose.confirmChannelChange'));
      if (!confirmed) return;
    }
    setSelectedChannelId(nextId);
  }

  function renderCandidateSelector(candidates: ChannelRecipientCandidate[]) {
    if (candidates.length <= 1) return null;
    return (
      <div className="card card--pad" style={{ marginBlockEnd: 16 }}>
        <label htmlFor="channel-compose-selector" style={{ display: 'block', marginBlockEnd: 6 }}>
          {t('channels.compose.selectChannel')}
        </label>
        <select
          id="channel-compose-selector"
          className="select"
          value={selectedChannelId ?? ''}
          onChange={(e) => onChannelSelectChange(e.target.value)}
        >
          <option value="">{t('channels.compose.selectChannelPlaceholder')}</option>
          {candidates.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
              {!channel.can_send ? ` (${t('channels.viewOnly')})` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function renderSelectedChannelMeta(channel: ChannelRecipientCandidate) {
    return (
      <div className="wrap-gap" style={{ marginBlockEnd: 12 }}>
        <strong dir="auto">{channel.name}</strong>
        <Badge tone="slate">{channelTypeLabel(t, channel.type)}</Badge>
        {!channel.can_send ? <Badge tone="amber">{t('channels.viewOnly')}</Badge> : null}
      </div>
    );
  }

  const loading =
    studentState.loading || (studentId != null && candidatesState.loading);
  const studentError = studentState.error;
  const candidatesError = candidatesState.error;

  return (
    <div className="admin-workspace">
      <Link href="/admin/channels" className="back-link">
        ‹ {t('channels.backToChannels')}
      </Link>

      <PageHeader title={t('channels.compose.title')} />

      {identity?.arabic ? (
        <div className="stack" style={{ gap: 8, marginBlockEnd: 16 }}>
          <div className="stack" style={{ gap: 4 }}>
            <span dir="auto" style={{ fontWeight: 600, fontSize: 18 }}>
              {identity.arabic}
            </span>
            {identity.latin ? (
              <span className="faint" dir="ltr">
                {identity.latin}
              </span>
            ) : null}
          </div>
          <div>
            <Link href={profileHref} className="btn btn--ghost btn--sm">
              {t('channels.compose.openStudentProfile')}
            </Link>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div aria-live="polite">
          <LoadingState label={t('channels.compose.loading')} />
        </div>
      ) : null}

      {!loading && studentError ? (
        <ApiErrorView error={studentError} onRetry={studentState.reload} />
      ) : null}

      {!loading && !studentError && candidatesError ? (
        <ApiErrorView error={candidatesError} />
      ) : null}

      {!loading && !studentError && !candidatesError && candidatesState.data ? (
        candidatesState.data.channel_count > 0 && channels.length > 0 ? (
          <>
            {renderCandidateSelector(channels)}
            {selectedChannelId == null && channels.length > 1 ? (
              <EmptyState
                icon="✉"
                title={t('channels.compose.selectChannel')}
                description={t('channels.compose.selectChannelHint')}
              />
            ) : null}
            {selectedChannelId != null
              ? (() => {
                  const selected =
                    channels.find((c) => c.id === selectedChannelId) ?? null;
                  if (!selected) return null;
                  return (
                    <>
                      {renderSelectedChannelMeta(selected)}
                      {!selected.can_send ? (
                        <EmptyState
                          icon="🔒"
                          title={t('channels.compose.cannotSendSelected')}
                          description={t('channels.compose.cannotSendSelectedDesc')}
                        />
                      ) : (
                        <ChannelChat
                          key={selectedChannelId}
                          channelId={selectedChannelId}
                          composerAutofocus
                        />
                      )}
                    </>
                  );
                })()
              : null}
          </>
        ) : (
          <EmptyState
            icon="✉"
            title={t(emptyReasonKey(candidatesState.data.reason))}
            description={t('channels.compose.emptyHint')}
            action={renderNavLinks()}
          />
        )
      ) : null}
    </div>
  );
}
