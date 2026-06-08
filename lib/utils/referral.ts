// Utility functions for referral and discount management
import { Discount, DiscountStatus, ReferralRecord } from './referral';

export const REFERRAL_DISCOUNT_PERCENTAGE = 50;
export const REFERRAL_DISCOUNT_EXPIRY_DAYS = 7;

/**
 * Create a referral discount for both the referrer and referee
 */
export function createReferralDiscounts(
  referrerId: string,
  refereeId: string
): { refereeDiscount: Discount; referrerDiscount: Discount } {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFERRAL_DISCOUNT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const refereeDiscount: Discount = {
    id: `discount_${refereeId}_${Date.now()}`,
    userId: refereeId,
    discountPercentage: REFERRAL_DISCOUNT_PERCENTAGE,
    type: 'referral' as const,
    status: 'active' as const,
    expiresAt,
    createdAt: now,
    referralCode: referrerId,
  };

  const referrerDiscount: Discount = {
    id: `discount_${referrerId}_${Date.now()}`,
    userId: referrerId,
    discountPercentage: REFERRAL_DISCOUNT_PERCENTAGE,
    type: 'referral' as const,
    status: 'active' as const,
    expiresAt,
    createdAt: now,
    referralCode: refereeId,
  };

  return { refereeDiscount, referrerDiscount };
}

/**
 * Check if a discount is still valid (not expired, not used)
 */
export function isDiscountValid(discount: Discount): boolean {
  const now = new Date();
  return discount.status === 'active' && discount.expiresAt > now;
}

/**
 * Apply a discount to a ticket purchase
 */
export function applyDiscount(
  discount: Discount,
  originalPrice: number,
  quantity: number
): { finalPrice: number; discountAmount: number } {
  if (!isDiscountValid(discount)) {
    throw new Error('Discount is not valid');
  }

  const totalPrice = originalPrice * quantity;
  const discountAmount = (totalPrice * discount.discountPercentage) / 100;
  const finalPrice = totalPrice - discountAmount;

  return { finalPrice, discountAmount };
}

/**
 * Mark discount as used
 */
export function markDiscountAsUsed(discount: Discount): Discount {
  return {
    ...discount,
    status: 'used' as DiscountStatus,
    usedAt: new Date(),
  };
}

/**
 * Check if two discounts can be combined (prevents double-dipping)
 */
export function canCombineDiscounts(discount1: Discount, discount2: Discount): boolean {
  // Discounts cannot be combined; can only use one per purchase
  return false;
}

/**
 * Calculate the final price with discount validation
 */
export function calculateFinalPrice(
  basePrice: number,
  quantity: number,
  discount?: Discount
): number {
  const totalPrice = basePrice * quantity;

  if (!discount) {
    return totalPrice;
  }

  if (!isDiscountValid(discount)) {
    return totalPrice;
  }

  const discountAmount = (totalPrice * discount.discountPercentage) / 100;
  return Math.max(0, totalPrice - discountAmount);
}

/**
 * Validate referral code and check for circular references
 */
export function validateReferralCode(
  referrerId: string,
  refereeId: string,
  existingReferrals: ReferralRecord[]
): boolean {
  // Cannot refer yourself
  if (referrerId === refereeId) {
    return false;
  }

  // Check for circular referrals
  const checkCircular = (userId: string, target: string, visited: Set<string>): boolean => {
    if (visited.has(userId)) return false;
    visited.add(userId);

    const referrals = existingReferrals.filter((r) => r.referrerId === userId);
    for (const referral of referrals) {
      if (referral.refereeId === target) {
        return true;
      }
      if (checkCircular(referral.refereeId, target, visited)) {
        return true;
      }
    }

    return false;
  };

  return !checkCircular(refereeId, referrerId, new Set());
}
