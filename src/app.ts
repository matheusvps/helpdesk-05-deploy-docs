import express from 'express';
import { authRouter } from './routes/auth.js';
import { commentsRouter } from './routes/comments.js';
import { ticketsRouter } from './routes/tickets.js';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/tickets', ticketsRouter);
app.use('/tickets/:id/comments', commentsRouter);
