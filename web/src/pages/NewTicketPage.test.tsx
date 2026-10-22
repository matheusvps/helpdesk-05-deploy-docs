import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { json, loginAs, mockFetch, renderAt } from '../test/utils';
import { NewTicketPage } from './NewTicketPage';

describe('NewTicketPage', () => {
  it('blocks the submit without a title and shows the error next to the field', async () => {
    loginAs('solicitante');
    const fetchMock = mockFetch(() => json(201, {}));
    const user = userEvent.setup();
    renderAt('/tickets/new', '/tickets/new', <NewTicketPage />);

    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }));

    expect(screen.getByLabelText('Título')).toHaveAccessibleDescription('Informe um título.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the validation error returned by the API', async () => {
    loginAs('solicitante');
    mockFetch(() => json(422, { error: 'Validation failed', fields: { title: ['Title is required'] } }));
    const user = userEvent.setup();
    renderAt('/tickets/new', '/tickets/new', <NewTicketPage />);

    await user.type(screen.getByLabelText('Título'), '   x');
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Validation failed');
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });
});
