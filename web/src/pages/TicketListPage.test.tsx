import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { json, loginAs, mockFetch, renderAt } from '../test/utils';
import { TicketListPage } from './TicketListPage';

describe('TicketListPage', () => {
  it('sends the status filter to the API as a query parameter', async () => {
    loginAs('atendente');
    const fetchMock = mockFetch(() => json(200, { items: [], page: 1, limit: 20, total: 0 }));
    const user = userEvent.setup();
    renderAt('/', '/', <TicketListPage />);

    await screen.findByText('Nenhum chamado encontrado.');
    await user.selectOptions(screen.getByLabelText('Status'), 'resolvido');

    await screen.findByText('Nenhum chamado encontrado.');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tickets?status=resolvido', expect.anything());
  });

  it('shows a message when the API cannot be reached', async () => {
    loginAs('atendente');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderAt('/', '/', <TicketListPage />);

    expect(screen.getByText('Carregando chamados...')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar à API');
  });
});
