import { Router } from 'express';
import {
  createAdSlot,
  getActiveAdSlots,
  getAllAdSlots,
  updateAdSlot,
} from '../../lib/db/queries';
import { validateAdSlot } from '../../lib/utils/ads';

const router = Router();

// Get active ads only
router.get('/active', async (req, res) => {
  try {
    const ads = await getActiveAdSlots();
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Get all ads (admin)
router.get('/', async (req, res) => {
  try {
    const ads = await getAllAdSlots();
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Create ad (admin)
router.post('/', async (req, res) => {
  try {
    const { mediaType, mediaUrl, textContent, title, description, callToActionUrl, displayDuration } =
      req.body;

    const validation = validateAdSlot({
      mediaType,
      mediaUrl,
      textContent,
      title,
      description,
      callToActionUrl,
      displayDuration,
    });

    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const ad = await createAdSlot({
      mediaType,
      mediaUrl,
      textContent,
      title,
      description,
      callToActionUrl,
      displayDuration,
      isActive: true,
    });

    res.status(201).json(ad);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

// Update ad (admin)
router.patch('/:id', async (req, res) => {
  try {
    const ad = await updateAdSlot(req.params.id, req.body);
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

export default router;
