import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { parseBody, PRIORITIES, STATUSES } from '../validation.js';

export const ticketsRouter = Router();

const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  priority: z.enum(PRIORITIES).default('media'),
  requester_name: z.string().trim().min(1, 'Requester name is required'),
});

const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty'),
    description: z.string(),
    priority: z.enum(PRIORITIES),
    status: z.enum(STATUSES),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Send at least one field to update');

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

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

ticketsRouter.get('/', (req, res) => {
  const query = listQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(422).json({ error: 'Invalid query', fields: query.error.flatten().fieldErrors });
    return;
  }
  const { status, page, limit } = query.data;
  const where = status ? 'WHERE status = @status' : '';
  const items = db
    .prepare(`SELECT * FROM tickets ${where} ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset`)
    .all({ status, limit, offset: (page - 1) * limit });
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM tickets ${where}`).get({ status }) as { total: number };
  res.json({ items, page, limit, total });
});

ticketsRouter.get('/:id', (req, res) => {
  const ticket = findTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

ticketsRouter.patch('/:id', (req, res) => {
  if (!findTicket(req.params.id)) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const data = parseBody(updateTicketSchema, req.body, res);
  if (!data) return;
  // Column names come from the schema keys above, never from the request directly.
  const columns = Object.keys(data) as (keyof typeof data)[];
  const sets = columns.map((c) => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE tickets SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({
    ...data,
    id: req.params.id,
  });
  res.json(findTicket(req.params.id));
});
