import { Router } from 'express';
import {
  createDraw,
  getDrawById,
  getAllDraws,
  getLiveDraws,
  updateDraw,
  getTicketsByDrawId,
  getWinnersByDrawId,
  createTicket,
  createWinner,
  getWinnerDisplayOrder,
  setWinnerDisplayOrder,
} from '../../lib/db/queries';
import {
  getSortedWinnersWithDynamicDisplay,
  generateNewSeed,
} from '../../lib/utils/winner';

const router = Router();

// Get all draws
router.get('/', async (req, res) => {
  try {
    const allDraws = await getAllDraws();
    res.json(allDraws);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

// Get live draws only
router.get('/live', async (req, res) => {
  try {
    const liveDraws = await getLiveDraws();
    res.json(liveDraws);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live draws' });
  }
});

// Get specific draw
router.get('/:id', async (req, res) => {
  try {
    const draw = await getDrawById(req.params.id);
    if (!draw) {
      return res.status(404).json({ error: 'Draw not found' });
    }
    res.json(draw);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch draw' });
  }
});

// Create draw
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      backgroundType,
      backgroundImageUrl,
      customDesignData,
      ticketPrice,
      totalTickets,
      drawDate,
    } = req.body;

    if (!name || !ticketPrice || !totalTickets || !drawDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const draw = await createDraw({
      name,
      description,
      backgroundType: backgroundType || 'natural',
      backgroundImageUrl,
      customDesignData,
      ticketPrice,
      totalTickets,
      drawDate: new Date(drawDate),
      status: 'pending',
    });

    res.status(201).json(draw);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create draw' });
  }
});

// Update draw
router.patch('/:id', async (req, res) => {
  try {
    const draw = await updateDraw(req.params.id, req.body);
    res.json(draw);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update draw' });
  }
});

// Get draw winners
router.get('/:id/winners', async (req, res) => {
  try {
    const winners = await getWinnersByDrawId(req.params.id);

    // Get display order
    const displayOrderData = await getWinnerDisplayOrder(req.params.id);
    let displayOrder: { displayIndices: number[] } | null = null;

    if (displayOrderData) {
      const parsedOrder = JSON.parse(displayOrderData.displayOrder);
      const displayIndices = winners.map((w) => {
        const index = parsedOrder.indexOf(w.id);
        return index !== -1 ? index : winners.indexOf(w);
      });
      displayOrder = { displayIndices };
    }

    res.json({ winners, displayOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch winners' });
  }
});

// Add winner to draw
router.post('/:drawId/winners', async (req, res) => {
  try {
    const { ticketId, userId, ticketNumber, holderName, holderEmail, prizeAmount } = req.body;

    if (!ticketId || !userId || !ticketNumber || !holderName || !prizeAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const winner = await createWinner({
      drawId: req.params.drawId,
      ticketId,
      userId,
      ticketNumber,
      holderName,
      holderEmail,
      prizeAmount,
    });

    // Regenerate display order
    const winners = await getWinnersByDrawId(req.params.drawId);
    const data = getSortedWinnersWithDynamicDisplay(winners as any, generateNewSeed());
    await setWinnerDisplayOrder(
      req.params.drawId,
      data.displayIndices.map((i) => winners[i].id),
      Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    );

    res.status(201).json(winner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create winner' });
  }
});

// Get draw tickets
router.get('/:id/tickets', async (req, res) => {
  try {
    const tickets = await getTicketsByDrawId(req.params.id);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Add ticket to draw
router.post('/:drawId/tickets', async (req, res) => {
  try {
    const { userId, ticketNumber } = req.body;

    if (!userId || !ticketNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ticket = await createTicket({
      drawId: req.params.drawId,
      userId,
      ticketNumber,
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

export default router;
