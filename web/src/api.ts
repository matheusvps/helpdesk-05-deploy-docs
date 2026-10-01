import { clearSession, getToken } from './session';

// Comes from the build environment (see web/.env.example); defaults to the dev proxy.
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API. Tente novamente.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // An expired or missing token anywhere except the login itself sends the user back to login.
    if (response.status === 401 && path !== '/auth/login') {
      clearSession();
      window.location.assign('/login?expired=1');
    }
    throw new ApiError(response.status, body?.error ?? `Erro ${response.status}`, body?.fields);
  }
  return body as T;
}

// Text shown to the user for a failed request.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Acesso negado: você não tem permissão para acessar este recurso.';
    if (error.status === 404) return 'Chamado não encontrado.';
    return error.message;
  }
  return 'Algo deu errado. Tente novamente.';
}
