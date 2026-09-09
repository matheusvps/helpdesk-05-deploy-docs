import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { parseBody } from '../validation.js';
import { findTicket } from './tickets.js';

// Mounted at /tickets/:id/comments
export const commentsRouter = Router({ mergeParams: true });

const createCommentSchema = z.object({
  author: z.string().trim().min(1, 'Author is required'),
  body: z.string().trim().min(1, 'Comment text is required'),
});

commentsRouter.get('/', (req: { params: { id: string } }, res) => {
  if (!findTicket(req.params.id)) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(db.prepare('SELECT * FROM comments WHERE ticket_id = ? ORDER BY id').all(req.params.id));
});

commentsRouter.post('/', (req: { params: { id: string }; body: unknown }, res) => {
  if (!findTicket(req.params.id)) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const data = parseBody(createCommentSchema, req.body, res);
  if (!data) return;
  const { lastInsertRowid } = db
    .prepare('INSERT INTO comments (ticket_id, author, body) VALUES (?, ?, ?)')
    .run(req.params.id, data.author, data.body);
  res.status(201).json(db.prepare('SELECT * FROM comments WHERE id = ?').get(lastInsertRowid));
});
