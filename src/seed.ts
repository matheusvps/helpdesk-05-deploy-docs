// Demo data: one agent, two requesters and tickets in every status.
// Usage: npm run seed  (run the migrations first). Safe to run twice: it skips if the demo users exist.
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const PASSWORD = 'demo1234';

const users = [
  { name: 'Carla Atendente', email: 'agent@demo.dev', role: 'atendente' },
  { name: 'Ana Souza', email: 'ana@demo.dev', role: 'solicitante' },
  { name: 'Bruno Lima', email: 'bruno@demo.dev', role: 'solicitante' },
];

const tickets = [
  { requester: 'ana@demo.dev', title: 'Printer on 2nd floor is jammed', priority: 'alta', status: 'aberto' },
  { requester: 'ana@demo.dev', title: 'Cannot access the VPN from home', priority: 'media', status: 'em_andamento' },
  { requester: 'bruno@demo.dev', title: 'Request a second monitor', priority: 'baixa', status: 'resolvido' },
  { requester: 'bruno@demo.dev', title: 'Email signature is wrong', priority: 'baixa', status: 'fechado' },
];

if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(users[0].email)) {
  console.log('Demo data already exists, nothing to do.');
  process.exit(0);
}

const hash = bcrypt.hashSync(PASSWORD, 10);
const ids = new Map<string, number | bigint>();

db.transaction(() => {
  for (const u of users) {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(u.name, u.email, hash, u.role);
    ids.set(u.email, lastInsertRowid);
  }
  for (const t of tickets) {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO tickets (title, description, priority, status, requester_id) VALUES (?, ?, ?, ?, ?)')
      .run(t.title, 'Created by the demo seed.', t.priority, t.status, ids.get(t.requester));
    db.prepare('INSERT INTO comments (ticket_id, author_id, body) VALUES (?, ?, ?)').run(
      lastInsertRowid,
      ids.get('agent@demo.dev'),
      'Thanks, we are looking into it.',
    );
  }
})();

console.log(`Seeded ${users.length} users and ${tickets.length} tickets. Password for all users: ${PASSWORD}`);
