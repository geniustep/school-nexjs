'use client';

import { Badge } from '@/components/ui/primitives';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { formatCountLabel } from '@/lib/i18n/count-plural';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import {
  countSelectedTracks,
  selectableReferenceTracks,
  selectableTrackIdsForLevel,
} from '../utils/level-options';

export function ReferenceLevelTrackPanel({
  level,
  expanded,
  selectedTrackIds,
  disabled,
  showValidationError,
  onToggleExpanded,
  onToggleTrack,
  onSelectAll,
  onClearAll,
}: {
  level: ReferenceLevelOption;
  expanded: boolean;
  selectedTrackIds: Set<number>;
  disabled?: boolean;
  showValidationError?: boolean;
  onToggleExpanded: () => void;
  onToggleTrack: (trackId: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const tracks = selectableReferenceTracks(level);
  const selectableIds = selectableTrackIdsForLevel(level);
  const { selected, total } = countSelectedTracks(level, new Map([[level.id, selectedTrackIds]]));
  const panelId = `ref-level-tracks-${level.id}`;
  const summaryId = `ref-level-tracks-summary-${level.id}`;

  if (!level.supports_tracks || tracks.length === 0) return null;

  return (
    <div className="academic-setup-ref-level__tracks">
      <button
        type="button"
        className="academic-setup-ref-level__tracks-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-describedby={summaryId}
        disabled={disabled}
        onClick={onToggleExpanded}
      >
        <span>{t('admin.academicSetup.guided.selectTracksForLevel')}</span>
        <span id={summaryId} className="tiny muted">
          {t('admin.academicSetup.guided.selectedTracks', {
            selected,
            total,
            summary: formatCountLabel(t, locale, 'track', selected),
          })}
        </span>
      </button>

      {expanded && (
        <fieldset className="academic-setup-ref-level__tracks-panel" id={panelId}>
          <legend className="academic-setup-sr-only">{t('admin.academicSetup.guided.availableTracks')}</legend>
          <div className="academic-setup-ref-level__tracks-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={disabled || selectableIds.length === 0}
              onClick={onSelectAll}
            >
              {t('admin.academicSetup.guided.selectAllTracks')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={disabled || selected === 0}
              onClick={onClearAll}
            >
              {t('admin.academicSetup.guided.clearTrackSelection')}
            </button>
          </div>
          <ul className="academic-setup-ref-level__track-list" role="list">
            {tracks.map((track) => {
              const isEnabled = track.enabled;
              const canSelect = track.can_enable && !isEnabled && !disabled;
              const checked = isEnabled || selectedTrackIds.has(track.id);
              const inputId = `ref-track-${level.id}-${track.id}`;

              return (
                <li key={track.id}>
                  <label
                    className={`academic-setup-ref-level__track-row${!canSelect ? ' academic-setup-ref-level__track-row--disabled' : ''}`}
                    htmlFor={inputId}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      disabled={!canSelect}
                      onChange={() => onToggleTrack(track.id)}
                    />
                    <span className="academic-setup-ref-level__track-main">
                      <strong>{track.name}</strong>
                      <span className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
                        {isEnabled ? (
                          <Badge tone="green">{t('admin.academicSetup.guided.trackEnabledInSchool')}</Badge>
                        ) : track.can_enable ? (
                          <Badge tone="blue">{t('admin.academicSetup.guided.trackNotEnabled')}</Badge>
                        ) : (
                          <Badge tone="slate">{t('admin.academicSetup.guided.trackCannotEnable')}</Badge>
                        )}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {showValidationError && (
            <p className="tiny academic-setup-ref-level__tracks-error" role="alert">
              {t('admin.academicSetup.guided.selectAtLeastOneTrack')}
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
