'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { Level } from '@/types/class';
import type { AcademicTrack } from '@/types/academic-setup';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { aggregateBatchResults, levelSupportsTracks, suggestClassNames } from '../utils/guided-flow';
import { mapClassApiError } from '@/features/admin/class-form-utils';
import { SetupDrawer } from './setup-drawer';

interface BatchRow {
  name: string;
  code: string;
}

export function BatchClassDrawer({
  open,
  level,
  trackLevels,
  onClose,
  onSaved,
}: {
  open: boolean;
  level: Level;
  trackLevels: import('../utils/guided-flow').TrackLevelRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [count, setCount] = useState(3);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [trackId, setTrackId] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  const supportsTracks = levelSupportsTracks(level.id, trackLevels);
  const tracksState = useAdminResource<AcademicTrack[]>(
    supportsTracks ? endpoints.admin.tracks : null,
    supportsTracks ? { level_id: level.id, limit: 200 } : undefined,
  );

  useEffect(() => {
    if (!open) return;
    const names = suggestClassNames(level.name, count);
    setRows(
      names.map((name, i) => ({
        name,
        code: `${level.code ?? 'C'}${String.fromCharCode(65 + i)}`,
      })),
    );
    setRowErrors([]);
    setTrackId('');
  }, [open, count, level.id, level.name, level.code]);

  function updateRow(index: number, field: keyof BatchRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    if (saving) return;
    const valid = rows.filter((r) => r.name.trim());
    if (!valid.length) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    const errors: string[] = [];
    const results = await Promise.all(
      valid.map(async (row, index) => {
        const payload: Record<string, unknown> = {
          name: row.name.trim(),
          code: row.code.trim() || undefined,
          level_id: level.id,
          capacity: capacity ? Number(capacity) : undefined,
          status: 'active',
        };
        if (supportsTracks && trackId) payload.track_id = Number(trackId);
        const res = await api.post(endpoints.admin.classes, payload);
        if (!res.success) {
          errors[index] = mapClassApiError(res.error, t);
        }
        return { ok: res.success };
      }),
    );
    const agg = aggregateBatchResults(results);
    setSaving(false);
    setRowErrors(errors);

    if (agg.allOk) {
      toast.success(t('admin.academicSetup.guided.classesBatchSuccess', { count: agg.successCount }));
      onSaved();
      onClose();
      return;
    }

    toast.error(
      t('admin.academicSetup.guided.classesBatchPartial', {
        success: agg.successCount,
        failed: agg.failCount,
      }),
    );
    if (agg.successCount > 0) onSaved();
  }

  return (
    <SetupDrawer open={open} title={t('admin.academicSetup.guided.batchClassesTitle')} onClose={onClose}>
      <div className="col" style={{ gap: 12 }}>
        <label className="col" style={{ gap: 6 }}>
          <span className="tiny muted">{t('nav.levels')}</span>
          <input className="input" value={level.name} readOnly aria-readonly />
        </label>
        <label className="col" style={{ gap: 6 }}>
          <span className="tiny muted">{t('admin.academicSetup.guided.classCount')}</span>
          <input
            className="input"
            type="number"
            min={1}
            max={12}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
          />
        </label>
        {supportsTracks && (
          <label className="col" style={{ gap: 6 }}>
            <span className="tiny muted">{t('admin.academicSetup.classTrackLabel')}</span>
            <select className="input" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">{t('common.dash')}</option>
              {(tracksState.data ?? []).map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="col" style={{ gap: 6 }}>
          <span className="tiny muted">{t('admin.capacity')}</span>
          <input
            className="input"
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
        <div className="col" style={{ gap: 8 }}>
          {rows.map((row, index) => (
            <div key={index} className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 2, minWidth: 140 }}
                value={row.name}
                onChange={(e) => updateRow(index, 'name', e.target.value)}
                aria-label={t('admin.className')}
              />
              <input
                className="input"
                style={{ flex: 1, minWidth: 80 }}
                value={row.code}
                onChange={(e) => updateRow(index, 'code', e.target.value)}
                aria-label={t('admin.code')}
              />
              {rowErrors[index] && (
                <span className="tiny" style={{ color: '#b91c1c', width: '100%' }}>
                  {rowErrors[index]}
                </span>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSave}>
          {saving ? t('common.saving') : t('admin.academicSetup.guided.createClasses')}
        </button>
      </div>
    </SetupDrawer>
  );
}
