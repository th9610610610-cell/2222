// Advertisement slot types
export enum AdMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
}

export interface AdSlot {
  id: string;
  mediaType: AdMediaType;
  mediaUrl?: string; // For IMAGE and VIDEO
  textContent?: string; // For TEXT type
  title?: string;
  description?: string;
  callToActionUrl?: string;
  displayDuration: number; // in seconds
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdSlotConfig {
  maxWidth: string; // e.g., "320px"
  maxHeight: string; // e.g., "240px"
  objectFit: 'cover' | 'contain' | 'fill' | 'scale-down';
}
