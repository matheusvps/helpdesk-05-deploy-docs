CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'solicitante' CHECK (role IN ('solicitante', 'atendente')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
