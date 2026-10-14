export type Status = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';

// Allowed status changes. Anything not listed here is rejected with 409.
export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  aberto: ['em_andamento'],
  em_andamento: ['resolvido'],
  resolvido: ['fechado', 'em_andamento'],
  fechado: [],
};

export function canTransition(from: Status, to: Status) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
