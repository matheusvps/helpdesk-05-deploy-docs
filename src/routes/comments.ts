import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { parseBody } from '../validation.js';
import { loadTicketForUser } from './tickets.js';

// Mounted at /tickets/:id/comments
export const commentsRouter = Router({ mergeParams: true });
commentsRouter.use(requireAuth);

const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment text is required'),
});

const SELECT_COMMENT = `SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id = c.author_id`;

commentsRouter.get('/', (req, res) => {
  const ticket = loadTicketForUser(req, res, (req.params as { id: string }).id);
  if (!ticket) return;
  res.json(db.prepare(`${SELECT_COMMENT} WHERE c.ticket_id = ? ORDER BY c.id`).all(ticket.id));
});

commentsRouter.post('/', (req, res) => {
  const ticket = loadTicketForUser(req, res, (req.params as { id: string }).id);
  if (!ticket) return;
  const data = parseBody(createCommentSchema, req.body, res);
  if (!data) return;
  const { lastInsertRowid } = db
    .prepare('INSERT INTO comments (ticket_id, author_id, body) VALUES (?, ?, ?)')
    .run(ticket.id, req.user!.id, data.body);
  res.status(201).json(db.prepare(`${SELECT_COMMENT} WHERE c.id = ?`).get(lastInsertRowid));
});
