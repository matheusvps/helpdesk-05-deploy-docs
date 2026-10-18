import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/db.js';

export const api = () => request(app);

let counter = 0;

// Registers a user (optionally as agent) and returns its id and a valid token.
export async function createUser(role: 'solicitante' | 'atendente' = 'solicitante') {
  counter += 1;
  const email = `user${counter}@example.com`;
  const password = 'password123';
  const registered = await api().post('/auth/register').send({ name: `User ${counter}`, email, password });
  if (role === 'atendente') db.prepare("UPDATE users SET role = 'atendente' WHERE email = ?").run(email);
  const login = await api().post('/auth/login').send({ email, password });
  return { id: registered.body.id as number, token: login.body.token as string };
}

export async function createTicket(token: string, body: object = { title: 'Printer is broken' }) {
  const res = await api().post('/tickets').set('Authorization', `Bearer ${token}`).send(body);
  return res.body as { id: number; status: string };
}
