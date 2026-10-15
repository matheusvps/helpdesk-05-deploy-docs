import type { ErrorRequestHandler, RequestHandler } from 'express';

// Every error response has the shape { error: string, fields?: { [field]: string[] } }.

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // express.json() throws this when the body is not valid JSON.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
