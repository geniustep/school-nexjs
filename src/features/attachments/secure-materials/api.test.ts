import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, uploadForm, remove } = vi.hoisted(() => ({
  post: vi.fn(),
  uploadForm: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ api: { post, uploadForm, delete: remove } }));

import {
  addSessionLink,
  createUploadSession,
  finalizeUploadSession,
  uploadSessionFile,
} from './api';

describe('secure upload-session browser contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a purpose-bound session with idempotency and extracts credentials', async () => {
    post.mockResolvedValue({ success: true, data: { public_id: '4f4a', credential: 'uss1.secret' }, meta: {} });
    const result = await createUploadSession({ purpose: 'channel_message', channelId: 9, idempotencyKey: 'create-1' });
    expect(result).toMatchObject({ success: true, data: { publicId: '4f4a', credential: 'uss1.secret' } });
    expect(post).toHaveBeenCalledWith('/attachments/upload-sessions', { purpose: 'channel_message', channel_id: 9 }, undefined, { 'Idempotency-Key': 'create-1' });
  });

  it('keeps the credential in the header for file, link, and finalize', async () => {
    const session = { publicId: 'public-1', credential: 'uss1.secret' };
    uploadForm.mockResolvedValue({ success: true, data: { material: { id: 2, state: 'ready', name: 'a.png' } }, meta: {} });
    post.mockResolvedValue({ success: true, data: { material: { id: 3, material_kind: 'link', state: 'ready', title: 'فيديو YouTube', original_name: 'https://youtu.be/x', url: 'https://youtu.be/x' } }, meta: {} });
    await uploadSessionFile(session, new File(['x'], 'a.png', { type: 'image/png' }), 'file-1');
    const link = await addSessionLink(session, 'https://youtu.be/x', 'link-1');
    await finalizeUploadSession({ path: '/teacher/finalize', session, idempotencyKey: 'final-1', body: { name: 'A' } });
    expect(uploadForm.mock.calls[0][0]).toBe('/attachments/upload-sessions/public-1/files');
    expect(uploadForm.mock.calls[0][3]).toEqual({ 'X-Upload-Session-Credential': 'uss1.secret' });
    expect(post.mock.calls[0][0]).toBe('/attachments/upload-sessions/public-1/links');
    expect(link.success && link.data?.name).toBe('فيديو YouTube');
    expect(post.mock.calls[0][3]).toEqual({ 'X-Upload-Session-Credential': 'uss1.secret' });
    expect(post.mock.calls[1][3]).toEqual({ 'X-Upload-Session-Credential': 'uss1.secret', 'Idempotency-Key': 'final-1' });
    expect(post.mock.calls.flat().join(' ')).not.toContain('/uss1.secret');
  });
});
