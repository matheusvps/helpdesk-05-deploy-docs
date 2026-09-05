import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { parseBody, PRIORITIES } from '../validation.js';

export const ticketsRouter = Router();

const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  priority: z.enum(PRIORITIES).default('media'),
  requester_name: z.string().trim().min(1, 'Requester name is required'),
});

export function findTicket(id: string) {
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
}

ticketsRouter.post('/', (req, res) => {
  const data = parseBody(createTicketSchema, req.body, res);
  if (!data) return;
  const { lastInsertRowid } = db
    .prepare('INSERT INTO tickets (title, description, priority, requester_name) VALUES (?, ?, ?, ?)')
    .run(data.title, data.description, data.priority, data.requester_name);
  res.status(201).json(findTicket(String(lastInsertRowid)));
});

ticketsRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM tickets ORDER BY created_at DESC, id DESC').all());
});

ticketsRouter.get('/:id', (req, res) => {
  const ticket = findTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});
