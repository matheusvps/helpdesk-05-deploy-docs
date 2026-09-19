import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config.js';
import { db } from '../db.js';
import { parseBody } from '../validation.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(8, 'Password must have at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

const publicUser = (id: number | bigint) =>
  db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id);

authRouter.post('/register', async (req, res) => {
  const data = parseBody(registerSchema, req.body, res);
  if (!data) return;
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
    res.status(409).json({ error: 'Email already registered', fields: { email: ['Email already registered'] } });
    return;
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  // Every new account is a requester; agents are promoted with `npm run promote-agent`.
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(data.name, data.email, passwordHash);
  res.status(201).json(publicUser(lastInsertRowid));
});

authRouter.post('/login', async (req, res) => {
  const data = parseBody(loginSchema, req.body, res);
  if (!data) return;
  const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(data.email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = jwt.sign({}, JWT_SECRET, { subject: String(user.id), expiresIn: JWT_EXPIRES_IN });
  res.json({ token, user: publicUser(user.id) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user!.id));
});
