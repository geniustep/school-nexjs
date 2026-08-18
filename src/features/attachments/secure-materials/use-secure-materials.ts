'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { validateAttachmentUploadFiles } from '@/lib/attachments/upload-policy';
import {
  addSessionLink,
  apiErrorMessage,
  cancelUploadSession,
  createIdempotencyKey,
  createUploadSession,
  removeSessionMaterial,
  uploadSessionFile,
} from './api';
import type { SecureMaterial, UploadSessionCredential, UploadSessionPurpose } from './types';
import { trustedVideoFromUserUrl } from '@/lib/attachments/trusted-smart-link';

const VALIDATION_MESSAGES = {
  too_many_files: 'الحد الأقصى خمسة عناصر بين الملفات والروابط.',
  file_too_large: 'حجم الملف يتجاوز 10 ميغابايت.',
  unsupported_file_type: 'نوع الملف غير مدعوم. رفع الفيديو المباشر غير متاح.',
  pick_at_least_one: 'اختر ملفًا واحدًا على الأقل.',
} as const;

function validationMessage(reason: keyof typeof VALIDATION_MESSAGES | undefined): string {
  return VALIDATION_MESSAGES[reason ?? 'unsupported_file_type'];
}

export function useSecureMaterials(options: { purpose: UploadSessionPurpose; channelId?: number }) {
  const [materials, setMaterials] = useState<SecureMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const sessionRef = useRef<UploadSessionCredential | null>(null);
  const createPromiseRef = useRef<Promise<UploadSessionCredential> | null>(null);
  const createKeyRef = useRef(createIdempotencyKey('upload-session'));
  const sourceFilesRef = useRef(new Map<string, File>());

  const ensureSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    if (createPromiseRef.current) return createPromiseRef.current;
    setCreating(true);
    const promise = createUploadSession({
      purpose: options.purpose,
      channelId: options.channelId,
      idempotencyKey: createKeyRef.current,
    }).then((result) => {
      if (!result.success || !result.data) throw new Error(apiErrorMessage(!result.success ? result.error : undefined));
      sessionRef.current = result.data;
      return result.data;
    }).finally(() => {
      setCreating(false);
      createPromiseRef.current = null;
    });
    createPromiseRef.current = promise;
    return promise;
  }, [options.channelId, options.purpose]);

  const uploadIntoItem = useCallback(async (
    session: UploadSessionCredential,
    file: File,
    clientItemId: string,
  ) => {
    const result = await uploadSessionFile(session, file, clientItemId);
    setMaterials((current) => current.map((item) => {
      if (item.clientItemId !== clientItemId) return item;
      if (!result.success || !result.data) {
        return {
          ...item,
          state: 'failed',
          error: apiErrorMessage(!result.success ? result.error : undefined),
        };
      }
      return {
        ...result.data,
        localPreviewUrl: item.localPreviewUrl,
      };
    }));
    return result.success && Boolean(result.data);
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    setError(null);
    const validation = validateAttachmentUploadFiles(files, materials.length);
    if (!validation.ok) {
      setError(validationMessage(validation.reason));
      return;
    }

    let session: UploadSessionCredential;
    try {
      session = await ensureSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء جلسة الرفع.');
      return;
    }

    const pending = files.map((file) => {
      const clientItemId = crypto.randomUUID();
      const localPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      sourceFilesRef.current.set(clientItemId, file);
      return {
        id: clientItemId,
        clientItemId,
        kind: 'file' as const,
        state: 'uploading' as const,
        name: file.name,
        size: file.size,
        mimetype: file.type,
        localPreviewUrl,
      };
    });

    setMaterials((current) => [...current, ...pending]);

    await Promise.all(
      pending.map((item, index) => uploadIntoItem(session, files[index], item.clientItemId)),
    );
  }, [ensureSession, materials.length, uploadIntoItem]);

  const addLink = useCallback(async (url: string) => {
    setError(null);
    if (materials.length >= 5) {
      setError('الحد الأقصى خمسة عناصر بين الملفات والروابط.');
      return false;
    }
    let session: UploadSessionCredential;
    try {
      session = await ensureSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء جلسة الرفع.');
      return false;
    }
    const clientItemId = crypto.randomUUID();
    const video = trustedVideoFromUserUrl(url);
    setMaterials((current) => [...current, {
      id: clientItemId,
      clientItemId,
      kind: 'link',
      state: 'uploading',
      name: url,
      url,
      provider: video?.provider,
      embedUrl: video?.embedUrl,
      canEmbed: Boolean(video),
      clickToLoad: Boolean(video),
    }]);
    const result = await addSessionLink(session, url, clientItemId);
    setMaterials((current) => current.map((item) =>
      item.clientItemId === clientItemId
        ? result.success && result.data
          ? result.data
          : { ...item, state: 'failed', error: apiErrorMessage(!result.success ? result.error : undefined) }
        : item,
    ));
    return result.success;
  }, [ensureSession, materials.length]);

  const remove = useCallback(async (item: SecureMaterial) => {
    setError(null);
    if (item.state === 'uploading') return false;

    if (sessionRef.current && typeof item.id === 'number') {
      const result = await removeSessionMaterial(sessionRef.current, item.id);
      if (!result.success) {
        setError(apiErrorMessage(result.error));
        return false;
      }
    }

    if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);
    sourceFilesRef.current.delete(item.clientItemId);
    setMaterials((current) => current.filter((candidate) => candidate.clientItemId !== item.clientItemId));
    return true;
  }, []);

  const replaceFile = useCallback(async (item: SecureMaterial, file: File) => {
    setError(null);
    if (item.kind !== 'file' || item.state === 'uploading') return false;

    const validation = validateAttachmentUploadFiles([file], Math.max(0, materials.length - 1));
    if (!validation.ok) {
      setError(validationMessage(validation.reason));
      return false;
    }

    let session: UploadSessionCredential;
    try {
      session = await ensureSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء جلسة الرفع.');
      return false;
    }

    if (typeof item.id !== 'number') {
      setError('تعذر استبدال هذا الملف بأمان لأن حالة الرفع السابقة غير مؤكدة.');
      return false;
    }

    const removal = await removeSessionMaterial(session, item.id);
    if (!removal.success) {
      setError(apiErrorMessage(removal.error));
      return false;
    }

    const nextClientItemId = crypto.randomUUID();
    const localPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);
    sourceFilesRef.current.delete(item.clientItemId);
    sourceFilesRef.current.set(nextClientItemId, file);

    setMaterials((current) => current.map((candidate) => (
      candidate.clientItemId === item.clientItemId
        ? {
            id: nextClientItemId,
            clientItemId: nextClientItemId,
            kind: 'file',
            state: 'uploading',
            name: file.name,
            size: file.size,
            mimetype: file.type,
            localPreviewUrl,
          }
        : candidate
    )));

    return uploadIntoItem(session, file, nextClientItemId);
  }, [ensureSession, materials.length, uploadIntoItem]);

  const retryFile = useCallback(async (item: SecureMaterial) => {
    if (item.kind !== 'file' || item.state !== 'failed') return false;
    const source = sourceFilesRef.current.get(item.clientItemId);
    if (!source) {
      setError('تعذر العثور على الملف الأصلي لإعادة المحاولة.');
      return false;
    }
    return replaceFile(item, source);
  }, [replaceFile]);

  const cancel = useCallback(async () => {
    materials.forEach((item) => item.localPreviewUrl && URL.revokeObjectURL(item.localPreviewUrl));
    sourceFilesRef.current.clear();
    setMaterials([]);
    if (sessionRef.current) await cancelUploadSession(sessionRef.current);
    sessionRef.current = null;
    createKeyRef.current = createIdempotencyKey('upload-session');
  }, [materials]);

  const busy = creating || materials.some((item) => item.state === 'uploading');
  const hasFailure = materials.some((item) => item.state === 'failed');
  const ready = !busy && !hasFailure;

  return useMemo(() => ({
    materials,
    error,
    busy,
    hasFailure,
    ready,
    session: sessionRef.current,
    ensureSession,
    addFiles,
    addLink,
    remove,
    replaceFile,
    retryFile,
    cancel,
    clearError: () => setError(null),
  }), [
    addFiles,
    addLink,
    busy,
    cancel,
    ensureSession,
    error,
    hasFailure,
    materials,
    ready,
    remove,
    replaceFile,
    retryFile,
  ]);
}
