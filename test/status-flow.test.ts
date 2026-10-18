import { describe, expect, it } from 'vitest';
import { api, createTicket, createUser } from './helpers.js';

async function setup() {
  const agent = await createUser('atendente');
  const requester = await createUser();
  const ticket = await createTicket(requester.token);
  const changeStatus = (status: string) =>
    api().patch(`/tickets/${ticket.id}`).set('Authorization', `Bearer ${agent.token}`).send({ status });
  return { changeStatus };
}

describe('status transitions', () => {
  it('follows the full flow aberto -> em_andamento -> resolvido -> em_andamento -> resolvido -> fechado', async () => {
    const { changeStatus } = await setup();
    for (const status of ['em_andamento', 'resolvido', 'em_andamento', 'resolvido', 'fechado']) {
      const res = await changeStatus(status);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  it('rejects skipping a step with 409 and says which transition is forbidden', async () => {
    const { changeStatus } = await setup();
    const res = await changeStatus('resolvido');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Status transition not allowed: aberto -> resolvido');
  });

  it('does not allow reopening a closed ticket', async () => {
    const { changeStatus } = await setup();
    for (const status of ['em_andamento', 'resolvido', 'fechado']) await changeStatus(status);
    for (const status of ['aberto', 'em_andamento', 'resolvido']) {
      const res = await changeStatus(status);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe(`Status transition not allowed: fechado -> ${status}`);
    }
  });

  it('rejects an unknown status with 422', async () => {
    const { changeStatus } = await setup();
    const res = await changeStatus('pendente');
    expect(res.status).toBe(422);
    expect(res.body.fields.status).toBeDefined();
  });
});
