import { Router } from 'express';
import { getAllWinners, getWinnersByDrawId } from '../../lib/db/queries';

const router = Router();

// Get all winners
router.get('/', async (req, res) => {
  try {
    const winners = await getAllWinners();
    res.json(winners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

// Get winners for specific draw
router.get('/draw/:drawId', async (req, res) => {
  try {
    const winners = await getWinnersByDrawId(req.params.drawId);
    res.json(winners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

export default router;
