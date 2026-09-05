import type { Response } from 'express';
import type { z } from 'zod';

export const PRIORITIES = ['baixa', 'media', 'alta'] as const;
export const STATUSES = ['aberto', 'em_andamento', 'resolvido', 'fechado'] as const;

// Parses the body with the schema; on failure answers 422 and returns null.
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown, res: Response): z.infer<T> | null {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    res.status(422).json({ error: 'Validation failed', fields: result.error.flatten().fieldErrors });
    return null;
  }
  return result.data;
}
