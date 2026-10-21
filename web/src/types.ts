export const STATUSES = ['aberto', 'em_andamento', 'resolvido', 'fechado'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

// Same flow as the API (src/status-flow.ts). The API is the one that enforces it.
export const NEXT_STATUSES: Record<Status, Status[]> = {
  aberto: ['em_andamento'],
  em_andamento: ['resolvido'],
  resolvido: ['fechado', 'em_andamento'],
  fechado: [],
};

export const PRIORITIES = ['baixa', 'media', 'alta'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  requester_id: number;
  requester_name: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
