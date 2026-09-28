'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/states/states';
import { Badge, Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLocale } from '@/features/i18n/locale-context';
import {
  adoptEdgeAudioLibraryAsset,
  edgeAudioAssetPreviewUrl,
  edgeAudioLibraryPreviewUrl,
  fetchEdgeAudioLibrary,
  updateEdgeAudioAsset,
  uploadEdgeAudioAsset,
  uploadEdgeAudioRevision,
} from '@/features/admin/edge/api/client';
import type {
  EdgeAudioAsset,
  EdgeAudioCategory,
  EdgeAudioLibraryAsset,
} from '@/features/admin/edge/types';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const COPY = {
  ar: {
    title: 'مكتبة الأصوات',
    subtitle: 'اختر من أصوات رقيم أو ارفع أصوات المؤسسة بصيغة WAV.',
    raqeemTitle: 'مكتبة رقيم',
    raqeemDesc: 'أصوات أصلية جاهزة اقترحتها رقيم ويمكن إضافتها للمؤسسة بنقرة واحدة.',
    schoolTitle: 'أصوات المؤسسة',
    schoolDesc: 'الأصوات الخاصة بهذه المدرسة فقط. لا تتم مشاركتها مع أي مؤسسة أخرى.',
    upload: '+ إضافة صوت',
    uploadTitle: 'إضافة صوت إلى مكتبة المؤسسة',
    uploadName: 'اسم الصوت',
    uploadNamePlaceholder: 'مثال: جرس الدخول الرئيسي',
    category: 'النوع',
    chooseFile: 'اختيار ملف WAV',
    replaceFile: 'إصدار صوتي جديد',
    add: 'إضافة إلى المكتبة',
    cancel: 'إلغاء',
    use: 'استخدام',
    inLibrary: 'مضاف للمؤسسة',
    disable: 'تعطيل',
    enable: 'تفعيل',
    active: 'مفعّل',
    inactive: 'موقوف',
    raqeemSource: 'مكتبة رقيم',
    schoolSource: 'رفع المؤسسة',
    noSchoolSounds: 'لم تضف المؤسسة أصواتًا خاصة بعد.',
    noSchoolSoundsDesc: 'يمكنك استعمال أحد أصوات رقيم أو رفع ملف WAV من جهازك.',
    noRaqeemSounds: 'لا توجد أصوات مقترحة متاحة حاليًا.',
    loadingLibrary: 'جارٍ تحميل مكتبة رقيم…',
    libraryError: 'تعذر تحميل مكتبة رقيم.',
    uploadSuccess: 'تمت إضافة الصوت إلى مكتبة المؤسسة.',
    revisionSuccess: 'تم إنشاء إصدار صوتي جديد.',
    adoptSuccess: 'تمت إضافة صوت رقيم إلى مكتبة المؤسسة.',
    updateSuccess: 'تم تحديث حالة الصوت.',
    actionError: 'تعذر تنفيذ العملية.',
    invalidWav: 'اختر ملف WAV صالحًا.',
    tooLarge: 'حجم ملف الصوت يجب ألا يتجاوز 5 MB.',
    preview: 'معاينة',
    version: 'الإصدار',
    size: 'الحجم',
    duration: 'المدة',
    all: 'الكل',
    categories: {
      entry: 'الدخول',
      class_start: 'بداية الحصة',
      break: 'الاستراحة',
      return: 'العودة',
      exit: 'الخروج',
      general: 'عام',
    },
  },
  fr: {
    title: 'Bibliothèque sonore',
    subtitle: "Choisissez un son Raqeem ou ajoutez les sons propres à l’établissement au format WAV.",
    raqeemTitle: 'Bibliothèque Raqeem',
    raqeemDesc: "Des sonneries originales proposées par Raqeem, prêtes à être ajoutées à l’établissement.",
    schoolTitle: "Sons de l’établissement",
    schoolDesc: "Ces sons appartiennent uniquement à cet établissement et ne sont jamais partagés avec une autre école.",
    upload: '+ Ajouter un son',
    uploadTitle: "Ajouter un son à l’établissement",
    uploadName: 'Nom du son',
    uploadNamePlaceholder: "Ex. Sonnerie principale d’entrée",
    category: 'Type',
    chooseFile: 'Choisir un fichier WAV',
    replaceFile: 'Nouvelle version audio',
    add: 'Ajouter à la bibliothèque',
    cancel: 'Annuler',
    use: 'Utiliser',
    inLibrary: 'Ajouté à l’établissement',
    disable: 'Désactiver',
    enable: 'Activer',
    active: 'Actif',
    inactive: 'Désactivé',
    raqeemSource: 'Bibliothèque Raqeem',
    schoolSource: "Ajout de l’établissement",
    noSchoolSounds: "Aucun son propre à l’établissement.",
    noSchoolSoundsDesc: 'Utilisez un son Raqeem ou ajoutez un fichier WAV.',
    noRaqeemSounds: 'Aucun son Raqeem proposé pour le moment.',
    loadingLibrary: 'Chargement de la bibliothèque Raqeem…',
    libraryError: 'Impossible de charger la bibliothèque Raqeem.',
    uploadSuccess: "Le son a été ajouté à l’établissement.",
    revisionSuccess: 'Une nouvelle version audio a été créée.',
    adoptSuccess: 'Le son Raqeem a été ajouté à la bibliothèque de l’établissement.',
    updateSuccess: 'Le statut du son a été mis à jour.',
    actionError: "Impossible d’effectuer cette opération.",
    invalidWav: 'Choisissez un fichier WAV valide.',
    tooLarge: 'Le fichier audio ne doit pas dépasser 5 Mo.',
    preview: 'Aperçu',
    version: 'Version',
    size: 'Taille',
    duration: 'Durée',
    all: 'Tous',
    categories: {
      entry: 'Entrée',
      class_start: 'Début de cours',
      break: 'Récréation',
      return: 'Reprise',
      exit: 'Sortie',
      general: 'Général',
    },
  },
} as const;

const CATEGORIES: EdgeAudioCategory[] = [
  'entry',
  'class_start',
  'break',
  'return',
  'exit',
  'general',
];

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds}s`;
}

function validateUpload(file: File | null): 'ok' | 'type' | 'size' {
  if (!file || !file.name.toLowerCase().endsWith('.wav')) return 'type';
  if (file.size > MAX_UPLOAD_BYTES) return 'size';
  return 'ok';
}

export function AudioLibraryPanel({
  assets,
  onChanged,
}: {
  assets: EdgeAudioAsset[];
  onChanged: () => Promise<void>;
}) {
  const { locale } = useLocale();
  const toast = useToast();
  const copy = locale === 'fr' ? COPY.fr : COPY.ar;

  const [library, setLibrary] = useState<EdgeAudioLibraryAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState(false);
  const [category, setCategory] = useState<EdgeAudioCategory | 'all'>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<EdgeAudioCategory>('general');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  async function loadLibrary() {
    setLibraryLoading(true);
    setLibraryError(false);
    const result = await fetchEdgeAudioLibrary();
    if (!result.success) {
      setLibraryError(true);
      setLibraryLoading(false);
      return;
    }
    setLibrary(result.data.assets);
    setLibraryLoading(false);
  }

  useEffect(() => {
    void loadLibrary();
  }, []);

  const adoptedUids = useMemo(
    () => new Set(assets.map((asset) => asset.library_source_uid).filter(Boolean)),
    [assets],
  );

  const visibleLibrary = useMemo(
    () =>
      category === 'all'
        ? library
        : library.filter((asset) => asset.category === category),
    [category, library],
  );

  const visibleSchool = useMemo(
    () =>
      category === 'all'
        ? assets
        : assets.filter((asset) => asset.category === category),
    [category, assets],
  );

  function chooseUpload(file: File | null) {
    const verdict = validateUpload(file);
    if (verdict === 'type') {
      toast.error(copy.invalidWav);
      return;
    }
    if (verdict === 'size') {
      toast.error(copy.tooLarge);
      return;
    }
    setUploadFile(file);
    if (file && !uploadName.trim()) {
      setUploadName(file.name.replace(/\.wav$/i, '').replace(/[-_]+/g, ' '));
    }
  }

  async function submitUpload() {
    if (!uploadFile || !uploadName.trim() || busyKey) return;
    const verdict = validateUpload(uploadFile);
    if (verdict !== 'ok') {
      toast.error(verdict === 'size' ? copy.tooLarge : copy.invalidWav);
      return;
    }

    setBusyKey('upload');
    const result = await uploadEdgeAudioAsset({
      name: uploadName.trim(),
      category: uploadCategory,
      file: uploadFile,
    });
    setBusyKey(null);

    if (!result.success) {
      toast.error(result.error.message || copy.actionError);
      return;
    }

    toast.success(copy.uploadSuccess);
    setUploadOpen(false);
    setUploadName('');
    setUploadCategory('general');
    setUploadFile(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    await onChanged();
  }

  async function adopt(asset: EdgeAudioLibraryAsset) {
    if (busyKey) return;
    setBusyKey(`adopt:${asset.library_uid}`);
    const result = await adoptEdgeAudioLibraryAsset(asset.library_uid);
    setBusyKey(null);
    if (!result.success) {
      toast.error(result.error.message || copy.actionError);
      return;
    }
    toast.success(copy.adoptSuccess);
    await onChanged();
  }

  async function toggleAsset(asset: EdgeAudioAsset) {
    if (busyKey) return;
    setBusyKey(`toggle:${asset.asset_uid}`);
    const result = await updateEdgeAudioAsset(asset.asset_uid, {
      active: !asset.active,
    });
    setBusyKey(null);
    if (!result.success) {
      toast.error(result.error.message || copy.actionError);
      return;
    }
    toast.success(copy.updateSuccess);
    await onChanged();
  }

  async function replaceAudio(asset: EdgeAudioAsset, file: File | null) {
    if (!file || busyKey) return;
    const verdict = validateUpload(file);
    if (verdict !== 'ok') {
      toast.error(verdict === 'size' ? copy.tooLarge : copy.invalidWav);
      return;
    }

    setBusyKey(`revision:${asset.asset_uid}`);
    const result = await uploadEdgeAudioRevision(asset.asset_uid, file);
    setBusyKey(null);
    if (!result.success) {
      toast.error(result.error.message || copy.actionError);
      return;
    }
    toast.success(copy.revisionSuccess);
    await onChanged();
  }

  return (
    <div className="edge-audio-library">
      <div className="edge-audio-toolbar">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setUploadOpen((value) => !value)}
        >
          {copy.upload}
        </button>
      </div>

      {uploadOpen ? (
        <Card className="edge-audio-upload-card">
          <SectionHead title={copy.uploadTitle} />
          <div className="edge-audio-upload-grid">
            <label className="field">
              <span>{copy.uploadName}</span>
              <input
                className="input"
                value={uploadName}
                placeholder={copy.uploadNamePlaceholder}
                onChange={(event) => setUploadName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{copy.category}</span>
              <select
                className="select"
                value={uploadCategory}
                onChange={(event) =>
                  setUploadCategory(event.target.value as EdgeAudioCategory)
                }
              >
                {CATEGORIES.map((item) => (
                  <option value={item} key={item}>
                    {copy.categories[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="edge-audio-file-picker">
              <span>{copy.chooseFile}</span>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".wav,audio/wav,audio/x-wav"
                onChange={(event) => chooseUpload(event.target.files?.[0] ?? null)}
              />
              <strong dir="auto">{uploadFile?.name || 'WAV · 5 MB max'}</strong>
            </label>
          </div>
          <div className="edge-audio-upload-actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!uploadFile || !uploadName.trim() || busyKey === 'upload'}
              onClick={() => void submitUpload()}
            >
              {copy.add}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setUploadOpen(false)}
            >
              {copy.cancel}
            </button>
          </div>
        </Card>
      ) : null}

      <div className="edge-audio-categories" aria-label={copy.category}>
        <button
          type="button"
          className={category === 'all' ? 'is-active' : ''}
          onClick={() => setCategory('all')}
        >
          {copy.all}
        </button>
        {CATEGORIES.map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? 'is-active' : ''}
            onClick={() => setCategory(item)}
          >
            {copy.categories[item]}
          </button>
        ))}
      </div>

      <section className="edge-audio-section">
        <div className="edge-audio-section-head">
          <div>
            <h3>{copy.raqeemTitle}</h3>
            <p>{copy.raqeemDesc}</p>
          </div>
        </div>

        {libraryLoading ? (
          <LoadingState label={copy.loadingLibrary} />
        ) : libraryError ? (
          <Card>
            <div className="edge-audio-inline-error">
              <span>{copy.libraryError}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadLibrary()}>
                ↻
              </button>
            </div>
          </Card>
        ) : visibleLibrary.length === 0 ? (
          <EmptyState compact icon="♪" title={copy.noRaqeemSounds} />
        ) : (
          <div className="edge-audio-card-grid">
            {visibleLibrary.map((asset) => {
              const adopted = adoptedUids.has(asset.library_uid);
              return (
                <Card key={asset.library_uid} className="edge-audio-card">
                  <div className="edge-audio-card-head">
                    <div>
                      <strong dir="auto">
                        {locale === 'fr' ? asset.name_fr || asset.name_ar : asset.name_ar}
                      </strong>
                      <span className="edge-audio-category">
                        {copy.categories[asset.category]}
                      </span>
                    </div>
                    <Badge tone="green">{copy.raqeemSource}</Badge>
                  </div>
                  <p className="edge-audio-description" dir="auto">
                    {locale === 'fr'
                      ? asset.description_fr || asset.description_ar
                      : asset.description_ar}
                  </p>
                  {asset.current_version ? (
                    <>
                      <audio
                        className="edge-audio-player"
                        controls
                        preload="none"
                        src={edgeAudioLibraryPreviewUrl(asset.library_uid)}
                      />
                      <div className="edge-audio-meta">
                        <span>{copy.duration}: {formatDuration(asset.current_version.duration_ms)}</span>
                        <span>{copy.size}: {formatBytes(asset.current_version.size_bytes)}</span>
                      </div>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className={adopted ? 'btn btn--ghost' : 'btn btn--primary'}
                    disabled={adopted || busyKey === `adopt:${asset.library_uid}`}
                    onClick={() => void adopt(asset)}
                  >
                    {adopted ? copy.inLibrary : copy.use}
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="edge-audio-section">
        <div className="edge-audio-section-head">
          <div>
            <h3>{copy.schoolTitle}</h3>
            <p>{copy.schoolDesc}</p>
          </div>
        </div>

        {visibleSchool.length === 0 ? (
          <EmptyState
            compact
            icon="🎵"
            title={copy.noSchoolSounds}
            description={copy.noSchoolSoundsDesc}
          />
        ) : (
          <div className="edge-audio-card-grid">
            {visibleSchool.map((asset) => (
              <Card key={asset.asset_uid} className="edge-audio-card">
                <div className="edge-audio-card-head">
                  <div>
                    <strong dir="auto">{asset.name}</strong>
                    <span className="edge-audio-category">
                      {copy.categories[asset.category]}
                    </span>
                  </div>
                  <Badge tone={asset.active ? 'green' : 'amber'}>
                    {asset.active ? copy.active : copy.inactive}
                  </Badge>
                </div>
                <span className="edge-audio-source">
                  {asset.source === 'raqeem_library' ? copy.raqeemSource : copy.schoolSource}
                </span>
                {asset.current_version ? (
                  <>
                    <audio
                      className="edge-audio-player"
                      controls
                      preload="none"
                      src={edgeAudioAssetPreviewUrl(asset.asset_uid)}
                    />
                    <div className="edge-audio-meta">
                      <span>{copy.version}: {asset.current_version.version}</span>
                      <span>{copy.duration}: {formatDuration(asset.current_version.duration_ms)}</span>
                      <span>{copy.size}: {formatBytes(asset.current_version.size_bytes)}</span>
                    </div>
                  </>
                ) : null}
                <div className="edge-audio-card-actions">
                  <label className="btn btn--ghost btn--sm edge-audio-replace">
                    {copy.replaceFile}
                    <input
                      type="file"
                      accept=".wav,audio/wav,audio/x-wav"
                      onChange={(event) => {
                        void replaceAudio(asset, event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={busyKey === `toggle:${asset.asset_uid}`}
                    onClick={() => void toggleAsset(asset)}
                  >
                    {asset.active ? copy.disable : copy.enable}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
