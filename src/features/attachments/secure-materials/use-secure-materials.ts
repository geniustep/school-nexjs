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

export function useSecureMaterials(options: { purpose: UploadSessionPurpose; channelId?: number }) {
  const [materials, setMaterials] = useState<SecureMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const sessionRef = useRef<UploadSessionCredential | null>(null);
  const createPromiseRef = useRef<Promise<UploadSessionCredential> | null>(null);
  const createKeyRef = useRef(createIdempotencyKey('upload-session'));

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

  const addFiles = useCallback(async (files: File[]) => {
    setError(null);
    const validation = validateAttachmentUploadFiles(files, materials.length);
    if (!validation.ok) {
      const messages = {
        too_many_files: 'الحد الأقصى خمسة عناصر بين الملفات والروابط.',
        file_too_large: 'حجم الملف يتجاوز 10 ميغابايت.',
        unsupported_file_type: 'نوع الملف غير مدعوم. رفع الفيديو المباشر غير متاح.',
        pick_at_least_one: 'اختر ملفًا واحدًا على الأقل.',
      } as const;
      setError(messages[validation.reason ?? 'unsupported_file_type']);
      return;
    }
    let session: UploadSessionCredential;
    try {
      session = await ensureSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء جلسة الرفع.');
      return;
    }
    for (const file of files) {
      const clientItemId = crypto.randomUUID();
      const localPreviewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      const pending: SecureMaterial = {
        id: clientItemId,
        clientItemId,
        kind: 'file',
        state: 'uploading',
        name: file.name,
        size: file.size,
        mimetype: file.type,
        localPreviewUrl,
      };
      setMaterials((current) => [...current, pending]);
      const result = await uploadSessionFile(session, file, clientItemId);
      setMaterials((current) => current.map((item) => {
        if (item.clientItemId !== clientItemId) return item;
        if (!result.success || !result.data) {
          return { ...item, state: 'failed', error: apiErrorMessage(!result.success ? result.error : undefined) };
        }
        return { ...result.data, localPreviewUrl };
      }));
    }
  }, [ensureSession, materials.length]);

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
    setMaterials((current) => [...current, {
      id: clientItemId,
      clientItemId,
      kind: 'link',
      state: 'uploading',
      name: url,
      url,
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
    if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);
    setMaterials((current) => current.filter((candidate) => candidate.clientItemId !== item.clientItemId));
    if (sessionRef.current && typeof item.id === 'number') {
      const result = await removeSessionMaterial(sessionRef.current, item.id);
      if (!result.success) setError(apiErrorMessage(result.error));
    }
  }, []);

  const cancel = useCallback(async () => {
    materials.forEach((item) => item.localPreviewUrl && URL.revokeObjectURL(item.localPreviewUrl));
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
    cancel,
    clearError: () => setError(null),
  }), [addFiles, addLink, busy, cancel, ensureSession, error, hasFailure, materials, ready, remove]);
}
