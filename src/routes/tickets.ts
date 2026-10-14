import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { canTransition, type Status } from '../status-flow.js';
import { parseBody, PRIORITIES, STATUSES } from '../validation.js';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: Status;
  requester_id: number;
  requester_name: string;
  created_at: string;
  updated_at: string;
}

const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().default(''),
  priority: z.enum(PRIORITIES).default('media'),
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

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const SELECT_TICKET = `SELECT t.*, u.name AS requester_name FROM tickets t JOIN users u ON u.id = t.requester_id`;

export function findTicket(id: string | number | bigint) {
  return db.prepare(`${SELECT_TICKET} WHERE t.id = ?`).get(id) as Ticket | undefined;
}

// Loads the ticket the current user may see: 404 if it does not exist, 403 if it belongs to
// another requester. Agents can see every ticket. Sends the error and returns null on failure.
export function loadTicketForUser(req: Request, res: Response, id: string): Ticket | null {
  const ticket = findTicket(id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return null;
  }
  const user = req.user!;
  if (user.role !== 'atendente' && ticket.requester_id !== user.id) {
    res.status(403).json({ error: 'You do not have access to this ticket' });
    return null;
  }
  return ticket;
}

ticketsRouter.post('/', (req, res) => {
  const data = parseBody(createTicketSchema, req.body, res);
  if (!data) return;
  const { lastInsertRowid } = db
    .prepare('INSERT INTO tickets (title, description, priority, requester_id) VALUES (?, ?, ?, ?)')
    .run(data.title, data.description, data.priority, req.user!.id);
  res.status(201).json(findTicket(lastInsertRowid));
});

ticketsRouter.get('/', (req, res) => {
  const query = listQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(422).json({ error: 'Invalid query', fields: query.error.flatten().fieldErrors });
    return;
  }
  const { status, page, limit } = query.data;
  const user = req.user!;
  const conditions: string[] = [];
  // Requesters only ever see their own tickets.
  if (user.role !== 'atendente') conditions.push('t.requester_id = @userId');
  if (status) conditions.push('t.status = @status');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const params = { userId: user.id, status, limit, offset: (page - 1) * limit };

  const items = db
    .prepare(`${SELECT_TICKET} ${where} ORDER BY t.created_at DESC, t.id DESC LIMIT @limit OFFSET @offset`)
    .all(params);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM tickets t ${where}`).get(params) as { total: number };
  res.json({ items, page, limit, total });
});

ticketsRouter.get('/:id', (req, res) => {
  const ticket = loadTicketForUser(req, res, req.params.id);
  if (ticket) res.json(ticket);
});

ticketsRouter.patch('/:id', (req, res) => {
  const ticket = loadTicketForUser(req, res, req.params.id);
  if (!ticket) return;
  const data = parseBody(updateTicketSchema, req.body, res);
  if (!data) return;
  if (data.status !== undefined && req.user!.role !== 'atendente') {
    res.status(403).json({ error: 'Only agents can change the status of a ticket' });
    return;
  }
  if (data.status !== undefined && !canTransition(ticket.status, data.status)) {
    res.status(409).json({
      error: `Status transition not allowed: ${ticket.status} -> ${data.status}`,
      from: ticket.status,
      to: data.status,
    });
    return;
  }
  // Column names come from the schema keys above, never from the request directly.
  const columns = Object.keys(data) as (keyof typeof data)[];
  const sets = columns.map((c) => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE tickets SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({
    ...data,
    id: ticket.id,
  });
  res.json(findTicket(ticket.id));
});
