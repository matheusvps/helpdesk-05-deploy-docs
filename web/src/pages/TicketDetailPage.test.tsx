import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { json, loginAs, mockFetch, renderAt } from '../test/utils';
import { TicketDetailPage } from './TicketDetailPage';

const ticket = {
  id: 7,
  title: 'Printer is broken',
  description: '',
  priority: 'alta',
  status: 'aberto',
  requester_id: 2,
  requester_name: 'Ana',
  created_at: '2026-10-01 10:00:00',
  updated_at: '2026-10-01 10:00:00',
};

describe('TicketDetailPage', () => {
  it('shows the error message from the API when a status change is rejected', async () => {
    loginAs('atendente');
    mockFetch((url, init) => {
      if (init?.method === 'PATCH') {
        return json(409, { error: 'Status transition not allowed: aberto -> em_andamento' });
      }
      return url.endsWith('/comments') ? json(200, []) : json(200, ticket);
    });
    const user = userEvent.setup();
    renderAt('/tickets/7', '/tickets/:id', <TicketDetailPage />);

    await user.selectOptions(await screen.findByLabelText('Alterar status'), 'em_andamento');
    await user.click(screen.getByRole('button', { name: 'Atualizar status' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Status transition not allowed: aberto -> em_andamento');
    expect(screen.getByText(/Status:/).parentElement).toHaveTextContent('Aberto');
  });

  it('updates the status on screen after a successful change', async () => {
    loginAs('atendente');
    mockFetch((url, init) => {
      if (init?.method === 'PATCH') return json(200, { ...ticket, status: 'em_andamento' });
      return url.endsWith('/comments') ? json(200, []) : json(200, ticket);
    });
    const user = userEvent.setup();
    renderAt('/tickets/7', '/tickets/:id', <TicketDetailPage />);

    await user.selectOptions(await screen.findByLabelText('Alterar status'), 'em_andamento');
    await user.click(screen.getByRole('button', { name: 'Atualizar status' }));

    await waitFor(() => expect(screen.getByText(/Status:/).parentElement).toHaveTextContent('Em andamento'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows access denied when the API answers 403', async () => {
    loginAs('solicitante');
    mockFetch(() => json(403, { error: 'You do not have access to this ticket' }));
    renderAt('/tickets/7', '/tickets/:id', <TicketDetailPage />);

    expect(screen.getByText('Carregando chamado...')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado');
  });

  it('does not show the status form to requesters', async () => {
    loginAs('solicitante');
    mockFetch((url) => (url.endsWith('/comments') ? json(200, []) : json(200, ticket)));
    renderAt('/tickets/7', '/tickets/:id', <TicketDetailPage />);

    expect(await screen.findByText('#7 Printer is broken')).toBeInTheDocument();
    expect(screen.queryByLabelText('Alterar status')).not.toBeInTheDocument();
  });
});
