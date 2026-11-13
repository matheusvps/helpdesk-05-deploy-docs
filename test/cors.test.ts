import { describe, expect, it } from 'vitest';
import { api } from './helpers.js';

describe('CORS', () => {
  it('does not send CORS headers when CORS_ORIGIN is not set', async () => {
    const res = await api().get('/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
