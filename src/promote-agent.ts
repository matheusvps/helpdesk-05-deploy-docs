// Usage: npm run promote-agent -- someone@example.com
import { db } from './db.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run promote-agent -- <email>');
  process.exit(1);
}

const { changes } = db.prepare("UPDATE users SET role = 'atendente' WHERE email = ?").run(email);
if (changes === 0) {
  console.error(`No user registered with ${email}`);
  process.exit(1);
}
console.log(`${email} is now an agent (atendente)`);
