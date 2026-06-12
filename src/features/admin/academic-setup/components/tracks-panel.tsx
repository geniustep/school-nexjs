'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatCountLabel } from '@/lib/i18n/count-plural';
import type { AcademicTrack } from '@/types/academic-setup';
import {
  createTrack,
  deleteTrack,
  updateTrack,
  useTrackOptions,
  useTracksList,
} from '../hooks/use-tracks';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { SetupDrawer } from './setup-drawer';

export function TracksPanel({
  canManage,
  focusLevelId = null,
  onDataChanged,
}: {
  canManage: boolean;
  focusLevelId?: number | null;
  onDataChanged?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const searchParams = useSearchParams();
  const levelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [drawerOpen, setDrawerOpen] = useState(searchParams.get('action') === 'add-track');
  const [editTrack, setEditTrack] = useState<AcademicTrack | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => ({ search: search.trim() || undefined, limit: 200 }), [search]);
  const listState = useTracksList(query);
  const optionsState = useTrackOptions();

  const tracksByLevel = useMemo(() => {
    const map = new Map<number, AcademicTrack[]>();
    for (const track of listState.tracks) {
      const levelId = track.level.id;
      const list = map.get(levelId) ?? [];
      list.push(track);
      map.set(levelId, list);
    }
    return map;
  }, [listState.tracks]);

  const trackLevels = (optionsState.options?.levels ?? []).filter((l) => l.supports_tracks);

  useEffect(() => {
    if (focusLevelId == null || !Number.isFinite(focusLevelId)) return;
    const node = levelRefs.current.get(focusLevelId);
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusLevelId, trackLevels.length, listState.tracks.length]);

  function notifyChanged() {
    listState.reload();
    optionsState.reload();
    onDataChanged?.();
  }

  async function submitTrack(payload: Record<string, unknown>, id?: number) {
    setSaving(true);
    const res = id ? await updateTrack(id, payload) : await createTrack(payload);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'track'));
      return false;
    }
    toast.success(t('admin.saveSuccess'));
    notifyChanged();
    return true;
  }

  async function removeTrack(track: AcademicTrack) {
    if (!window.confirm(t('admin.academicSetup.confirmDeleteTrack'))) return;
    setSaving(true);
    const res = await deleteTrack(track.id);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'track'));
      return;
    }
    toast.success(t('admin.actionSuccess'));
    notifyChanged();
    setEditTrack(null);
  }

  if (listState.loading || optionsState.loading) {
    return <p className="muted">{t('common.loading')}</p>;
  }

  if (listState.error || optionsState.error) {
    return (
      <p className="muted">
        {listState.error?.message ?? optionsState.error?.message ?? t('admin.academicSetup.loadError')}
      </p>
    );
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="between row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.academicSetup.searchTracks')}
          aria-label={t('admin.academicSetup.searchTracks')}
        />
        {canManage && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setDrawerOpen(true)}>
            + {t('admin.academicSetup.addTrack')}
          </button>
        )}
      </div>
      {trackLevels.length === 0 ? (
        <p className="muted">{t('admin.academicSetup.noTrackLevels')}</p>
      ) : (
        trackLevels.map((level) => {
          const tracks = tracksByLevel.get(level.id) ?? [];
          return (
            <div
              key={level.id}
              className="academic-setup-level"
              data-focused={focusLevelId === level.id || undefined}
              ref={(node) => {
                if (node) levelRefs.current.set(level.id, node);
                else levelRefs.current.delete(level.id);
              }}
            >
              <div className="academic-setup-level__head" style={{ cursor: 'default' }}>
                <span>
                  <strong>{level.name}</strong>
                  <span className="tiny muted">
                    {' '}
                    · {formatCountLabel(t, locale, 'track', tracks.length)}
                  </span>
                </span>
              </div>
              <div className="academic-setup-level__body">
                {tracks.length === 0 ? (
                  <p className="muted tiny">{t('admin.academicSetup.noTracks')}</p>
                ) : (
                  tracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      className="academic-setup-class-row"
                      onClick={() => setEditTrack(track)}
                    >
                      <span>
                        <strong>{track.name}</strong>
                        <span className="tiny muted block mt-2">
                          {track.code}
                          {' · '}
                          {t('admin.academicSetup.trackMeta', {
                            classes: track.classes_count,
                            subjects: track.subjects_count,
                          })}
                        </span>
                      </span>
                      <Badge tone={track.active ? 'green' : 'slate'}>
                        {track.active ? t('admin.academicSetup.accountStatus.active') : t('admin.academicSetup.inactiveTrack')}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })
      )}
      <TrackFormDrawer
        open={drawerOpen || editTrack != null}
        track={editTrack}
        options={optionsState.options ?? undefined}
        canManage={canManage}
        saving={saving}
        initialLevelId={focusLevelId}
        onClose={() => {
          setDrawerOpen(false);
          setEditTrack(null);
        }}
        onSubmit={submitTrack}
        onDelete={editTrack ? () => removeTrack(editTrack) : undefined}
      />
    </div>
  );
}

function TrackFormDrawer({
  open,
  track,
  options,
  canManage,
  saving,
  initialLevelId,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  track: AcademicTrack | null;
  options?: import('@/types/academic-setup').TrackOptions;
  canManage: boolean;
  saving: boolean;
  initialLevelId?: number | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>, id?: number) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const t = useT();
  const creating = !track;
  const [levelId, setLevelId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [referenceTrackId, setReferenceTrackId] = useState('');

  useEffect(() => {
    if (!open) return;
    if (track) {
      setLevelId(String(track.level.id));
      setName(track.name);
      setCode(track.code);
      setReferenceTrackId('');
    } else {
      const preferred =
        initialLevelId != null &&
        options?.levels.some((l) => l.supports_tracks && l.id === initialLevelId)
          ? initialLevelId
          : options?.levels.find((l) => l.supports_tracks)?.id;
      setLevelId(preferred ? String(preferred) : '');
      setName('');
      setCode('');
      setReferenceTrackId('');
    }
  }, [track, options, open, initialLevelId]);

  const trackLevels = (options?.levels ?? []).filter((l) => l.supports_tracks);
  const refs = (options?.reference_tracks ?? []).filter(
    (r) => !levelId || r.level_id == null || String(r.level_id) === levelId,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !levelId || !name.trim() || !code.trim()) return;
    const payload: Record<string, unknown> = {
      level_id: Number(levelId),
      name: name.trim(),
      code: code.trim(),
    };
    if (referenceTrackId) payload.reference_track_id = Number(referenceTrackId);
    const ok = await onSubmit(payload, track?.id);
    if (ok) onClose();
  }

  return (
    <SetupDrawer
      open={open}
      title={creating ? t('admin.academicSetup.addTrack') : t('admin.academicSetup.editTrack')}
      onClose={onClose}
    >
      <form className="col" style={{ gap: 12 }} onSubmit={handleSubmit}>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('nav.levels')}</span>
          <select
            className="input"
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
            required
            disabled={!creating}
          >
            <option value="">{t('admin.selectLevel')}</option>
            {trackLevels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        {refs.length > 0 && creating && (
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.referenceTrack')}</span>
            <select
              className="input"
              value={referenceTrackId}
              onChange={(e) => {
                setReferenceTrackId(e.target.value);
                const ref = refs.find((r) => String(r.id) === e.target.value);
                if (ref) {
                  setName(ref.name);
                  if (ref.code) setCode(ref.code);
                }
              }}
            >
              <option value="">{t('common.dash')}</option>
              {refs.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.academicSetup.trackName')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.academicSetup.trackCode')}</span>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required />
        </label>
        {track?.subjects && track.subjects.length > 0 && (
          <div>
            <strong className="tiny muted">{t('nav.subjects')}</strong>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {track.subjects.map((s) => (
                <Badge key={s.id} tone="blue">
                  {s.name}
                  {' · '}
                  {s.source === 'track'
                    ? t('admin.academicSetup.subjectSourceTrack')
                    : t('admin.academicSetup.subjectSourceLevel')}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="row" style={{ gap: 8 }}>
          {canManage && (
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          )}
          {!creating && canManage && track?.can_delete && onDelete && (
            <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={onDelete}>
              {t('admin.academicSetup.deleteTrack')}
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
