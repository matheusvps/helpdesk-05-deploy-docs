import 'dotenv/config';
import Database from 'better-sqlite3';

export const db = new Database(process.env.DATABASE_PATH ?? 'helpdesk.db');
db.pragma('foreign_keys = ON');
