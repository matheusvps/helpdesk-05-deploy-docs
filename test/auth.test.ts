import { describe, expect, it } from 'vitest';
import { db } from '../src/db.js';
import { api, createUser } from './helpers.js';

describe('auth', () => {
  it('registers a requester and stores a bcrypt hash, not the password', async () => {
    const res = await api()
      .post('/auth/register')
      .send({ name: 'Ana', email: 'Ana@Example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'ana@example.com', role: 'solicitante' });
    expect(res.body).not.toHaveProperty('password_hash');
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(res.body.id) as {
      password_hash: string;
    };
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicated email with 409', async () => {
    const body = { name: 'Ana', email: 'ana@example.com', password: 'password123' };
    await api().post('/auth/register').send(body);
    const res = await api().post('/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid registration with 422 and field errors', async () => {
    const res = await api().post('/auth/register').send({ name: '', email: 'nope', password: '123' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('answers 401 for a wrong password', async () => {
    await createUser();
    const res = await api().post('/auth/login').send({ email: 'user1@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns the current user for a valid token', async () => {
    const { token } = await createUser();
    const res = await api().get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('solicitante');
  });
});
