import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../api';
import { PRIORITY_LABELS, STATUS_LABELS, STATUSES, type Page, type Ticket } from '../types';

export function TicketListPage() {
  // The filter lives in the URL (?status=...) so it survives reloads and can be shared.
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const query = status ? `?${new URLSearchParams({ status })}` : '';
    apiFetch<Page<Ticket>>(`/tickets${query}`)
      .then((page) => !cancelled && setTickets(page.items))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status]);

  function changeStatus(value: string) {
    setSearchParams(value ? { status: value } : {});
  }

  return (
    <>
      <h1>Chamados</h1>
      <label>
        Status
        <select value={status} onChange={(e) => changeStatus(e.target.value)}>
          <option value="">Todos</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {loading && <p>Carregando chamados...</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && tickets.length === 0 && <p>Nenhum chamado encontrado.</p>}
      {!loading && !error && tickets.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Prioridade</th>
              <th>Status</th>
              <th>Solicitante</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>
                  <Link to={`/tickets/${t.id}`}>{t.title}</Link>
                </td>
                <td>{PRIORITY_LABELS[t.priority]}</td>
                <td>{STATUS_LABELS[t.status]}</td>
                <td>{t.requester_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
