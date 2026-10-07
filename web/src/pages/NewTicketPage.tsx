import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiFetch, errorMessage } from '../api';
import { PRIORITIES, PRIORITY_LABELS, type Priority, type Ticket } from '../types';

export function NewTicketPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setTitleError('Informe um título.');
      return;
    }
    setTitleError(null);
    setSubmitting(true);
    try {
      const ticket = await apiFetch<Ticket>('/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, description, priority }),
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.fields?.title) setTitleError(err.fields.title[0]);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Novo chamado</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'title-error' : undefined}
          />
          {titleError && (
            <span id="title-error" className="field-error">
              {titleError}
            </span>
          )}
        </label>
        <label>
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>
        <label>
          Prioridade
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Abrir chamado'}
        </button>
      </form>
    </>
  );
}
