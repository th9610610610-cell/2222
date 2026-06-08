import { Router } from 'express';
import {
  getActiveDiscountsByUserId,
  getDiscountById,
  updateDiscount,
  createReferral,
  getReferralsByReferrerId,
  checkIfAlreadyReferred,
} from '../../lib/db/queries';
import { isDiscountValid, applyDiscount, createReferralDiscounts } from '../../lib/utils/referral';

const router = Router();

// Get user's active discounts
router.get('/user/:userId', async (req, res) => {
  try {
    const discounts = await getActiveDiscountsByUserId(req.params.userId);
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

// Get specific discount
router.get('/:id', async (req, res) => {
  try {
    const discount = await getDiscountById(req.params.id);
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }
    res.json(discount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discount' });
  }
});

// Apply discount to purchase
router.post('/:id/apply', async (req, res) => {
  try {
    const { price, quantity } = req.body;

    if (!price || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const discount = await getDiscountById(req.params.id);
    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    if (!isDiscountValid(discount as any)) {
      return res.status(400).json({ error: 'Discount is not valid or expired' });
    }

    const result = applyDiscount(discount as any, price, quantity);

    // Mark discount as used
    await updateDiscount(discount.id, {
      status: 'used',
      usedAt: new Date(),
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply discount' });
  }
});

// Create referral (mutual discount generation)
router.post('/referral/create', async (req, res) => {
  try {
    const { referrerId, refereeId } = req.body;

    if (!referrerId || !refereeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (referrerId === refereeId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Check if already referred
    const existing = await checkIfAlreadyReferred(referrerId, refereeId);
    if (existing) {
      return res.status(400).json({ error: 'Already referred this user' });
    }

    // Create mutual discounts
    const { refereeDiscount, referrerDiscount } = createReferralDiscounts(referrerId, refereeId);

    // Save referral record
    const referral = await createReferral({
      referrerId,
      refereeId,
      discountGivenToReferee: refereeDiscount.id,
      discountGivenToReferrer: referrerDiscount.id,
    });

    res.status(201).json({
      referral,
      refereeDiscount,
      referrerDiscount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// Get user's referrals
router.get('/referrals/:userId', async (req, res) => {
  try {
    const referrals = await getReferralsByReferrerId(req.params.userId);
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

export default router;
