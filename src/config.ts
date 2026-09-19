import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a random value.');
}

export const JWT_SECRET = jwtSecret;
// Tokens are not revoked on the server; access ends when the token expires.
export const JWT_EXPIRES_IN = '8h';
