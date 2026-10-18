import { describe, expect, it } from 'vitest';
import { api, createTicket, createUser } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('tickets', () => {
  it('creates a ticket with 201 and default status aberto', async () => {
    const { token } = await createUser();
    const res = await api().post('/tickets').set(auth(token)).send({ title: 'VPN is down', priority: 'alta' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'VPN is down', priority: 'alta', status: 'aberto' });
  });

  it('rejects a ticket without title with 422 and the field error', async () => {
    const { token } = await createUser();
    const res = await api().post('/tickets').set(auth(token)).send({ description: 'no title' });
    expect(res.status).toBe(422);
    expect(res.body.fields.title).toBeDefined();
  });

  it('rejects an invalid priority with 422', async () => {
    const { token } = await createUser();
    const res = await api().post('/tickets').set(auth(token)).send({ title: 'x', priority: 'urgent' });
    expect(res.status).toBe(422);
    expect(res.body.fields.priority).toBeDefined();
  });

  it('answers 400 for a malformed JSON body', async () => {
    const { token } = await createUser();
    const res = await api()
      .post('/tickets')
      .set(auth(token))
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(res.status).toBe(400);
  });

  it('answers 404 for a ticket that does not exist', async () => {
    const { token } = await createUser();
    expect((await api().get('/tickets/9999').set(auth(token))).status).toBe(404);
    expect((await api().get('/tickets/9999/comments').set(auth(token))).status).toBe(404);
    expect((await api().patch('/tickets/9999').set(auth(token)).send({ title: 'x' })).status).toBe(404);
  });

  describe('without a valid token', () => {
    it.each([
      ['get', '/tickets'],
      ['post', '/tickets'],
      ['get', '/tickets/1'],
      ['patch', '/tickets/1'],
      ['get', '/tickets/1/comments'],
      ['post', '/tickets/1/comments'],
    ] as const)('%s %s answers 401', async (method, path) => {
      const res = await api()[method](path);
      expect(res.status).toBe(401);
    });

    it('rejects an invalid token with 401', async () => {
      const res = await api().get('/tickets').set(auth('not-a-real-token'));
      expect(res.status).toBe(401);
    });
  });

  describe('requester scope', () => {
    it('lists only the tickets of the logged requester', async () => {
      const ana = await createUser();
      const bob = await createUser();
      await createTicket(ana.token, { title: 'Ana ticket' });
      await createTicket(bob.token, { title: 'Bob ticket' });

      const res = await api().get('/tickets').set(auth(ana.token));
      expect(res.status).toBe(200);
      expect(res.body.items.map((t: { title: string }) => t.title)).toEqual(['Ana ticket']);
    });

    it("answers 403 for another requester's ticket and its comments", async () => {
      const ana = await createUser();
      const bob = await createUser();
      const ticket = await createTicket(ana.token);

      expect((await api().get(`/tickets/${ticket.id}`).set(auth(bob.token))).status).toBe(403);
      expect((await api().get(`/tickets/${ticket.id}/comments`).set(auth(bob.token))).status).toBe(403);
      const comment = await api().post(`/tickets/${ticket.id}/comments`).set(auth(bob.token)).send({ body: 'hi' });
      expect(comment.status).toBe(403);
    });

    it('answers 403 when a requester tries to change the status of their own ticket', async () => {
      const ana = await createUser();
      const ticket = await createTicket(ana.token);
      const res = await api().patch(`/tickets/${ticket.id}`).set(auth(ana.token)).send({ status: 'em_andamento' });
      expect(res.status).toBe(403);
    });
  });

  describe('agents', () => {
    it('list tickets from every requester and filter by status', async () => {
      const agent = await createUser('atendente');
      const ana = await createUser();
      const bob = await createUser();
      const first = await createTicket(ana.token);
      await createTicket(bob.token);
      await api().patch(`/tickets/${first.id}`).set(auth(agent.token)).send({ status: 'em_andamento' });

      const all = await api().get('/tickets').set(auth(agent.token));
      expect(all.body.total).toBe(2);
      const open = await api().get('/tickets?status=aberto').set(auth(agent.token));
      expect(open.body.items).toHaveLength(1);
    });

    it('can comment on any ticket', async () => {
      const agent = await createUser('atendente');
      const ana = await createUser();
      const ticket = await createTicket(ana.token);
      const res = await api().post(`/tickets/${ticket.id}/comments`).set(auth(agent.token)).send({ body: 'On it' });
      expect(res.status).toBe(201);
      const list = await api().get(`/tickets/${ticket.id}/comments`).set(auth(ana.token));
      expect(list.body).toHaveLength(1);
    });
  });
});
