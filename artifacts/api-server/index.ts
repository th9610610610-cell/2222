import express from 'express';
import cors from 'cors';
import drawsRouter from './routes/draws';
import discountsRouter from './routes/discounts';
import adsRouter from './routes/ads';
import winnersRouter from './routes/winners';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/draws', drawsRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/winners', winnersRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
