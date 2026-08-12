import { describe, expect, it } from 'vitest';
import { normalizeCommunicationMaterials } from './normalize-communication-materials';
import type { CommunicationContent } from '@/types/communication';

function content(extra: Record<string, unknown>): CommunicationContent {
  return {
    id: 708,
    school_id: 3,
    content_type: 'announcement',
    state: 'submitted',
    ...extra,
  } as CommunicationContent;
}

describe('normalizeCommunicationMaterials', () => {
  it('reads files and trusted videos from the current frozen version', () => {
    const result = normalizeCommunicationMaterials(content({
      current_version: {
        id: 91,
        version_number: 1,
        attachments: [{ id: 17, name: 'note.pdf', mimetype: 'application/pdf', file_size: 120 }],
        links: [{
          id: 22,
          url: 'https://www.youtube.com/watch?v=aNFBseqZNUo',
          canonical_url: 'https://www.youtube.com/watch?v=aNFBseqZNUo',
          provider: 'youtube',
          embed_url: 'https://www.youtube-nocookie.com/embed/aNFBseqZNUo',
          can_embed: true,
        }],
      },
    }));

    expect(result.attachments).toEqual([expect.objectContaining({ id: 17, name: 'note.pdf', size: 120 })]);
    expect(result.links).toEqual([expect.objectContaining({ id: 22, provider: 'youtube', can_embed: true })]);
  });

  it('falls back to immutable snapshot JSON and rejects malformed entries', () => {
    const result = normalizeCommunicationMaterials(content({
      current_version: {
        id: 92,
        version_number: 1,
        attachment_snapshot_json: JSON.stringify([{ id: 18, name: 'image.png' }, { id: 0, name: 'bad' }]),
        link_snapshot_json: JSON.stringify({ links: [{
          id: 23,
          url: 'https://vimeo.com/123456',
          provider: 'vimeo',
          embed_url: 'https://player.vimeo.com/video/123456',
          can_embed: true,
        }] }),
      },
    }));

    expect(result.attachments).toHaveLength(1);
    expect(result.links).toEqual([expect.objectContaining({ provider: 'vimeo', can_embed: true })]);
  });
});
