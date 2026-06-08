// Referral and discount types
export enum DiscountType {
  REFERRAL = 'referral',
  PROMOTIONAL = 'promotional',
}

export enum DiscountStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
}

export interface Discount {
  id: string;
  userId: string;
  discountPercentage: number; // e.g., 50 for 50%
  type: DiscountType;
  status: DiscountStatus;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
  referralCode?: string; // For referral discounts
}

export interface ReferralRecord {
  id: string;
  referrerId: string; // User who shared their account number
  refereeId: string; // User who used the referral
  discountGivenToReferee: string; // Discount ID for the one who bought
  discountGivenToReferrer: string; // Discount ID for the referrer
  ticketsPurchased: number;
  createdAt: Date;
}

export interface DiscountApplication {
  discountId: string;
  appliedAmount: number;
  ticketQuantity: number;
  originalPrice: number;
  finalPrice: number;
}
