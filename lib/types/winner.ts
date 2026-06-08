// Winner page types
export interface WinnerTicket {
  id: string;
  drawId: string;
  ticketNumber: string;
  holderName: string;
  holderEmail?: string;
  prizeAmount: number;
  wonAt: Date;
}

export interface WinnerDisplayOrder {
  drawId: string;
  displayOrder: string[]; // Array of ticket IDs in display order
  lastUpdated: Date;
  seed: number; // Used for consistent shuffling
}

export interface SortedWinners {
  tickets: WinnerTicket[];
  displayIndices: number[]; // Mapping of display order to actual sorted position
}
