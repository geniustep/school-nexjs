export type UploadSessionPurpose =
  | 'homework'
  | 'announcement'
  | 'general_message'
  | 'channel_message';

export type SecureMaterialState = 'uploading' | 'ready' | 'failed';

export interface SecureMaterial {
  id: number | string;
  clientItemId: string;
  kind: 'file' | 'link';
  state: SecureMaterialState;
  name: string;
  size?: number;
  mimetype?: string;
  url?: string;
  canonicalUrl?: string;
  embedUrl?: string;
  provider?: string;
  canEmbed?: boolean;
  clickToLoad?: boolean;
  localPreviewUrl?: string;
  error?: string;
}

export interface UploadSessionCredential {
  publicId: string;
  credential: string;
}
