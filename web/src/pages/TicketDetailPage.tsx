import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../api';
import { getUser } from '../session';
import { NEXT_STATUSES, PRIORITY_LABELS, STATUS_LABELS, type Comment, type Status, type Ticket } from '../types';

export function TicketDetailPage() {
  const { id } = useParams();
  const isAgent = getUser()?.role === 'atendente';
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<Status | ''>('');
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([apiFetch<Ticket>(`/tickets/${id}`), apiFetch<Comment[]>(`/tickets/${id}/comments`)])
      .then(([t, c]) => {
        if (cancelled) return;
        setTicket(t);
        setComments(c);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!commentBody.trim()) return;
    setCommentError(null);
    try {
      const comment = await apiFetch<Comment>(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody }),
      });
      setComments((current) => [...current, comment]);
      setCommentBody('');
    } catch (err) {
      setCommentError(errorMessage(err));
    }
  }

  async function changeStatus(event: FormEvent) {
    event.preventDefault();
    if (!newStatus) return;
    setStatusError(null);
    try {
      const updated = await apiFetch<Ticket>(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setTicket(updated);
      setNewStatus('');
    } catch (err) {
      setStatusError(errorMessage(err));
    }
  }

  if (loading) return <p>Carregando chamado...</p>;
  if (error || !ticket)
    return (
      <p className="error" role="alert">
        {error ?? 'Chamado não encontrado.'}
      </p>
    );

  return (
    <>
      <h1>
        #{ticket.id} {ticket.title}
      </h1>
      <p>
        <strong>Status:</strong> {STATUS_LABELS[ticket.status]} · <strong>Prioridade:</strong>{' '}
        {PRIORITY_LABELS[ticket.priority]} · <strong>Solicitante:</strong> {ticket.requester_name}
      </p>
      <p>{ticket.description || <em>Sem descrição.</em>}</p>

      {isAgent && NEXT_STATUSES[ticket.status].length === 0 && <p>Chamado fechado: o status não pode mais mudar.</p>}
      {isAgent && NEXT_STATUSES[ticket.status].length > 0 && (
        <form onSubmit={changeStatus}>
          <label>
            Alterar status
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as Status)}>
              <option value="">Selecione...</option>
              {NEXT_STATUSES[ticket.status].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {statusError && (
            <p className="error" role="alert">
              {statusError}
            </p>
          )}
          <button type="submit" disabled={!newStatus}>
            Atualizar status
          </button>
        </form>
      )}

      <h2>Comentários</h2>
      {comments.length === 0 && <p>Nenhum comentário ainda.</p>}
      {comments.map((c) => (
        <div key={c.id} className="comment">
          <strong>{c.author_name}</strong> <small>{c.created_at}</small>
          <p>{c.body}</p>
        </div>
      ))}

      <form onSubmit={addComment}>
        <label>
          Novo comentário
          <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows={3} />
        </label>
        {commentError && (
          <p className="error" role="alert">
            {commentError}
          </p>
        )}
        <button type="submit" disabled={!commentBody.trim()}>
          Comentar
        </button>
      </form>
    </>
  );
}
