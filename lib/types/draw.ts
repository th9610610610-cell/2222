// Draw-related types and enums
export enum BackgroundType {
  NATURAL = 'natural',
  CUSTOM = 'custom',
  PICTURE = 'picture',
}

export interface Draw {
  id: string;
  name: string;
  description?: string;
  backgroundType: BackgroundType;
  backgroundImageUrl?: string; // For PICTURE type
  customDesignData?: Record<string, any>; // For CUSTOM type
  ticketPrice: number;
  totalTickets: number;
  drawnTickets: string[];
  status: 'pending' | 'live' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  drawDate: Date;
}

export interface DrawCard {
  draw: Draw;
  isLive: boolean;
}

export interface BackgroundConfig {
  type: BackgroundType;
  imageUrl?: string;
  customDesignData?: Record<string, any>;
}
