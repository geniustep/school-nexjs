'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { Badge, Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { AudioLibraryPanel } from '@/features/admin/edge/components/audio-library-panel';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import {
  fetchEdgeAudioAssets,
  fetchEdgeBellSchedule,
  fetchEdgeDevices,
  saveEdgeBellSchedule,
} from '@/features/admin/edge/api/client';
import { edgeBellCopyFor } from '@/features/admin/edge/copy';
import type {
  BellEventDraft,
  BellScheduleDraft,
  BellScheduleValidation,
  BellValidationCode,
  EdgeAudioAsset,
  EdgeBellScheduleData,
  EdgeDevice,
  EdgePageLoadState,
  EdgeWeekday,
} from '@/features/admin/edge/types';
import {
  copyDayEvents,
  createBellEventDraft,
  hydrateBellScheduleDraft,
  removeBellEventDraft,
  toBellSchedulePutInput,
  validateBellScheduleDraft,
} from '@/features/admin/edge/utils/bell-schedule-draft';
import '../edge-bell-schedule.css';

const WEEKDAYS: EdgeWeekday[] = ['0', '1', '2', '3', '4', '5', '6'];

function isoToday(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function shortVersion(value: string): string {
  if (value.length <= 22) return value;
  return `${value.slice(0, 12)}…${value.slice(-6)}`;
}

export function BellScheduleSettingsPage() {
  const { locale } = useLocale();
  const copy = edgeBellCopyFor(locale);
  const { formatDate, formatDateTime } = useFormat();
  const toast = useToast();

  const [pageState, setPageState] = useState<EdgePageLoadState>({ status: 'loading' });
  const [workspace, setWorkspace] = useState<'schedule' | 'audio'>('schedule');
  const [scheduleData, setScheduleData] = useState<EdgeBellScheduleData | null>(null);
  const [assets, setAssets] = useState<EdgeAudioAsset[]>([]);
  const [devices, setDevices] = useState<EdgeDevice[]>([]);
  const [draft, setDraft] = useState<BellScheduleDraft | null>(null);
  const [validation, setValidation] = useState<BellScheduleValidation>({
    valid: true,
    rows: {},
    days: {},
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [copySource, setCopySource] = useState<EdgeWeekday | null>(null);
  const [copyTargets, setCopyTargets] = useState<Set<EdgeWeekday>>(new Set());

  const usableAssets = useMemo(
    () => assets.filter((asset) => asset.active && asset.current_version),
    [assets],
  );

  const load = useCallback(async () => {
    setPageState({ status: 'loading' });
    const [scheduleResult, assetsResult, devicesResult] = await Promise.all([
      fetchEdgeBellSchedule(),
      fetchEdgeAudioAssets(),
      fetchEdgeDevices(),
    ]);

    const failed = [scheduleResult, assetsResult, devicesResult].find((result) => !result.success);
    if (failed && !failed.success) {
      setPageState({ status: 'error', error: failed.error });
      return;
    }
    if (!scheduleResult.success || !assetsResult.success || !devicesResult.success) return;

    const today = isoToday();
    setScheduleData(scheduleResult.data);
    setAssets(assetsResult.data.assets);
    setDevices(devicesResult.data.devices);
    setDraft(
      hydrateBellScheduleDraft(
        scheduleResult.data,
        copy.defaultScheduleName,
        today,
        addDays(today, 90),
      ),
    );
    setValidation({ valid: true, rows: {}, days: {} });
    setSaveError(false);
    setPageState({ status: 'ready' });
  }, [copy.defaultScheduleName]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshAudioAssets = useCallback(async () => {
    const result = await fetchEdgeAudioAssets();
    if (!result.success) {
      toast.error(copy.loadError);
      return;
    }
    setAssets(result.data.assets);
  }, [copy.loadError, toast]);

  function updateEvent(clientKey: string, patch: Partial<BellEventDraft>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            events: current.events.map((event) =>
              event.client_key === clientKey ? { ...event, ...patch } : event,
            ),
          }
        : current,
    );
    setValidation((current) => {
      const rows = { ...current.rows };
      delete rows[clientKey];
      return { ...current, rows };
    });
  }

  function addEvent(weekday: EdgeWeekday) {
    const defaultAsset = usableAssets[0]?.asset_uid ?? '';
    setDraft((current) =>
      current
        ? { ...current, events: [...current.events, createBellEventDraft(weekday, defaultAsset)] }
        : current,
    );
  }

  function removeEvent(clientKey: string) {
    setDraft((current) =>
      current ? { ...current, events: removeBellEventDraft(current.events, clientKey) } : current,
    );
  }

  function toggleCopyTarget(weekday: EdgeWeekday) {
    setCopyTargets((current) => {
      const next = new Set(current);
      if (next.has(weekday)) next.delete(weekday);
      else next.add(weekday);
      return next;
    });
  }

  function applyCopy() {
    if (!draft || !copySource || copyTargets.size === 0) return;
    setDraft({
      ...draft,
      events: copyDayEvents(draft.events, copySource, [...copyTargets]),
    });
    setCopySource(null);
    setCopyTargets(new Set());
    setValidation({ valid: true, rows: {}, days: {} });
  }

  function validationMessage(code: BellValidationCode): string {
    switch (code) {
      case 'name_required':
        return copy.nameRequired;
      case 'range_required':
        return copy.rangeRequired;
      case 'range_order':
        return copy.rangeOrder;
      case 'time_required':
        return copy.timeRequired;
      case 'time_invalid':
        return copy.timeInvalid;
      case 'audio_required':
        return copy.audioRequired;
      case 'duplicate_time':
        return copy.duplicateTime;
    }
  }

  async function handleSave() {
    if (!draft || saving) return;
    const nextValidation = validateBellScheduleDraft(draft);
    setValidation(nextValidation);
    setSaveError(false);
    if (!nextValidation.valid) return;

    setSaving(true);
    const result = await saveEdgeBellSchedule(toBellSchedulePutInput(draft));
    setSaving(false);

    if (!result.success) {
      setSaveError(true);
      toast.error(copy.saveError);
      return;
    }

    toast.success(copy.saved);
    await load();
  }

  if (pageState.status === 'loading') return <LoadingState />;
  if (pageState.status === 'error') {
    return <ApiErrorView error={pageState.error} onRetry={() => void load()} />;
  }
  if (!draft || !scheduleData) return <LoadingState />;

  const activeVersion = scheduleData.active_version;

  return (
    <div className="admin-workspace edge-bell-page">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <div className="edge-workspace-tabs" role="tablist" aria-label={copy.title}>
        <button
          type="button"
          role="tab"
          aria-selected={workspace === 'schedule'}
          className={workspace === 'schedule' ? 'is-active' : ''}
          onClick={() => setWorkspace('schedule')}
        >
          🔔 {copy.scheduleTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workspace === 'audio'}
          className={workspace === 'audio' ? 'is-active' : ''}
          onClick={() => setWorkspace('audio')}
        >
          🎵 {copy.audioLibraryTab}
        </button>
      </div>

      {workspace === 'audio' ? (
        <AudioLibraryPanel assets={assets} onChanged={refreshAudioAssets} />
      ) : (
        <>
      <div className="edge-status-grid">
        <Card className="edge-status-card">
          <SectionHead title={copy.deviceTitle} />
          {devices.length === 0 ? (
            <EmptyState compact icon="🔔" title={copy.noDeviceTitle} description={copy.noDeviceDesc} />
          ) : (
            <div className="edge-device-list">
              {devices.map((device) => (
                <div className="edge-device-row" key={device.device_uid}>
                  <div>
                    <strong dir="auto">{device.hostname || device.name}</strong>
                    <span className="muted">
                      {copy.agentVersion}: <bdi dir="ltr">{device.agent_version || '—'}</bdi>
                    </span>
                    <span className="muted">
                      {copy.lastSeen}:{' '}
                      {device.last_seen_at ? formatDateTime(device.last_seen_at) : copy.neverSeen}
                    </span>
                  </div>
                  <Badge tone={device.revoked_at || !device.active ? 'amber' : 'green'}>
                    {device.revoked_at || !device.active ? copy.revoked : copy.active}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="edge-status-card">
          <SectionHead title={copy.publishedTitle} />
          {activeVersion ? (
            <div className="edge-published-version">
              <code dir="ltr" title={activeVersion.version_uid}>
                {shortVersion(activeVersion.version_uid)}
              </code>
              <span className="muted">
                {copy.validPeriod}:{' '}
                <bdi dir="ltr">
                  {formatDate(activeVersion.valid_from)} → {formatDate(activeVersion.valid_until)}
                </bdi>
              </span>
              <span className="muted">
                {copy.generatedAt}:{' '}
                {activeVersion.generated_at ? formatDateTime(activeVersion.generated_at) : '—'}
              </span>
            </div>
          ) : (
            <EmptyState compact icon="☁" title={copy.noPublishedVersion} />
          )}
        </Card>
      </div>

      <Card>
        <SectionHead title={copy.activationPeriod} />
        <div className="edge-form-grid">
          <label className="field">
            <span>{copy.scheduleName}</span>
            <input
              className="input"
              value={draft.name}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value });
                setValidation((current) => ({ ...current, form: undefined }));
              }}
            />
          </label>
          <label className="field">
            <span>{copy.from}</span>
            <DatePickerInput
              value={draft.range_start}
              onChange={(value) => {
                setDraft({ ...draft, range_start: value });
                setValidation((current) => ({ ...current, form: undefined }));
              }}
              presets={false}
            />
          </label>
          <label className="field">
            <span>{copy.to}</span>
            <DatePickerInput
              value={draft.range_end}
              min={draft.range_start || undefined}
              onChange={(value) => {
                setDraft({ ...draft, range_end: value });
                setValidation((current) => ({ ...current, form: undefined }));
              }}
              presets={false}
            />
          </label>
        </div>
        {validation.form ? (
          <p className="form-error" role="alert">{validationMessage(validation.form)}</p>
        ) : null}
      </Card>

      {usableAssets.length === 0 ? (
        <Card>
          <EmptyState compact icon="♪" title={copy.noAudioTitle} description={copy.noAudioDesc} />
        </Card>
      ) : null}

      <section className="edge-week-section">
        <div className="edge-section-heading">
          <div>
            <h2>{copy.weeklyTitle}</h2>
            <p>{copy.weeklyDesc}</p>
          </div>
        </div>

        <div className="edge-day-grid">
          {WEEKDAYS.map((weekday) => {
            const dayEvents = draft.events.filter((event) => event.weekday === weekday);
            const dayError = validation.days[weekday];
            const copying = copySource === weekday;

            return (
              <Card key={weekday} className="edge-day-card">
                <div className="edge-day-head">
                  <div>
                    <h3>{copy.weekdays[weekday]}</h3>
                    <span className="muted">{dayEvents.length}</span>
                  </div>
                  <div className="edge-day-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={dayEvents.length === 0}
                      onClick={() => {
                        setCopySource(copying ? null : weekday);
                        setCopyTargets(new Set());
                      }}
                    >
                      {copy.copyDay}
                    </button>
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => addEvent(weekday)}>
                      {copy.addTime}
                    </button>
                  </div>
                </div>

                {copying ? (
                  <div className="edge-copy-panel">
                    <p>{copy.copyHelp}</p>
                    <div className="edge-copy-targets">
                      {WEEKDAYS.filter((day) => day !== weekday).map((day) => (
                        <label key={day}>
                          <input
                            type="checkbox"
                            checked={copyTargets.has(day)}
                            onChange={() => toggleCopyTarget(day)}
                          />
                          <span>{copy.weekdays[day]}</span>
                        </label>
                      ))}
                    </div>
                    <div className="edge-copy-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={copyTargets.size === 0}
                        onClick={applyCopy}
                      >
                        {copy.applyCopy}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setCopySource(null);
                          setCopyTargets(new Set());
                        }}
                      >
                        {copy.cancel}
                      </button>
                    </div>
                  </div>
                ) : null}

                {dayEvents.length === 0 ? (
                  <p className="edge-day-empty">{copy.noEvents}</p>
                ) : (
                  <div className="edge-event-list">
                    {dayEvents.map((event) => {
                      const rowError = validation.rows[event.client_key];
                      return (
                        <div className="edge-event-row" key={event.client_key}>
                          <label className="field">
                            <span>{copy.time}</span>
                            <input
                              type="time"
                              className="input"
                              dir="ltr"
                              value={event.local_time}
                              onChange={(e) => updateEvent(event.client_key, { local_time: e.target.value })}
                            />
                          </label>

                          <label className="field">
                            <span>{copy.label}</span>
                            <input
                              className="input"
                              dir="auto"
                              value={event.label}
                              placeholder={copy.labelPlaceholder}
                              onChange={(e) => updateEvent(event.client_key, { label: e.target.value })}
                            />
                          </label>

                          <label className="field">
                            <span>{copy.sound}</span>
                            <select
                              className="select"
                              value={event.audio_asset_uid}
                              onChange={(e) => updateEvent(event.client_key, { audio_asset_uid: e.target.value })}
                            >
                              <option value="">{copy.chooseSound}</option>
                              {assets.map((asset) => (
                                <option
                                  key={asset.asset_uid}
                                  value={asset.asset_uid}
                                  disabled={!asset.active || !asset.current_version}
                                >
                                  {asset.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="edge-event-toggle">
                            <input
                              type="checkbox"
                              checked={event.active}
                              onChange={(e) => updateEvent(event.client_key, { active: e.target.checked })}
                            />
                            <span>{copy.enabled}</span>
                          </label>

                          <button
                            type="button"
                            className="btn btn--ghost btn--sm edge-remove"
                            onClick={() => removeEvent(event.client_key)}
                          >
                            {copy.remove}
                          </button>

                          {rowError ? (
                            <p className="form-error edge-row-error" role="alert">
                              {validationMessage(rowError)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {dayError ? (
                  <p className="form-error" role="alert">{validationMessage(dayError)}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="edge-save-card">
        <InfoBanner
          title={copy.publishedTitle}
          description={
            locale === 'fr'
              ? 'La publication est côté serveur. Raqeem Edge récupère ensuite la version lors de sa synchronisation.'
              : 'النشر يتم على الخادم أولًا، ثم يجلب Raqeem Edge النسخة عند المزامنة التالية.'
          }
          icon="↻"
        />
        {saveError ? <p className="form-error" role="alert">{copy.saveError}</p> : null}
        <button
          type="button"
          className="btn btn--primary edge-save-button"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? copy.saving : copy.save}
        </button>
      </Card>
        </>
      )}
    </div>
  );
}
