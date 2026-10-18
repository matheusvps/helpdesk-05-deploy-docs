import { beforeEach } from 'vitest';
import { db } from '../src/db.js';
import { migrate } from '../src/migrate.js';

migrate(() => {});

beforeEach(() => {
  db.exec('DELETE FROM comments; DELETE FROM tickets; DELETE FROM users;');
});
