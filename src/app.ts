import express from 'express';
import { ticketsRouter } from './routes/tickets.js';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/tickets', ticketsRouter);
