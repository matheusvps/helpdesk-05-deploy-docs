import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './errors.js';
import { authRouter } from './routes/auth.js';
import { commentsRouter } from './routes/comments.js';
import { ticketsRouter } from './routes/tickets.js';

export const app = express();

// Only needed when the frontend is served from another origin (e.g. a static site in production).
// Comma-separated list of allowed origins; when unset, no CORS headers are sent.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
if (corsOrigins?.length) app.use(cors({ origin: corsOrigins }));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/tickets', ticketsRouter);
app.use('/tickets/:id/comments', commentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
