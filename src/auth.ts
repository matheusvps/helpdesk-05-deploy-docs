import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import { db } from './db.js';

export type Role = 'solicitante' | 'atendente';

export interface AuthUser {
  id: number;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

// Expects `Authorization: Bearer <token>`. The role is read from the database so a promotion
// takes effect without logging in again.
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  let userId: string | undefined;
  try {
    userId = (jwt.verify(token, JWT_SECRET) as jwt.JwtPayload).sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as AuthUser | undefined;
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.user = user;
  next();
};
