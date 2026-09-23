# Help desk API

A small help desk backend: requesters open tickets, agents follow them up and comment until they are solved.

Built with Node.js, TypeScript, Express and SQLite (`better-sqlite3`). The database schema lives in versioned SQL migrations under `migrations/`.

## Requirements

- Node.js 20 or newer
- npm

SQLite is embedded, so there is no database server to install. The database is a single file (`helpdesk.db` by default).

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment and set JWT_SECRET to a random value
cp .env.example .env
#    e.g. JWT_SECRET=$(openssl rand -hex 32)

# 3. Create the database and apply the migrations
npm run migrate

# 4. Start the API (http://localhost:3000)
npm run dev
```

For a production-like run: `npm run build && npm start`.

`npm run migrate` only applies migrations that were not applied yet (they are tracked in the `schema_migrations` table), so it is safe to run it again after pulling new migrations.

## Authentication and roles

Users sign up with name, email and password. Passwords are stored as **bcrypt** hashes. Login returns a **JWT** that must be sent on every ticket and comment request:

```
Authorization: Bearer <token>
```

The token is signed with `JWT_SECRET` (from the environment, never committed) and **expires after 8 hours**. There is no logout route: the client discards the token, and access ends when it expires.

There are two roles:

| Role                      | Can                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `solicitante` (requester) | Open tickets, see and comment on **their own** tickets                |
| `atendente` (agent)       | See and comment on **all** tickets, change the status of any ticket   |

Every new account is a `solicitante`. To make someone an agent, register the account and then run:

```bash
npm run promote-agent -- agent@example.com
```

Requests without a valid token get `401`. A requester opening another person's ticket or its comments, or trying to change a status, gets `403`.

## Example requests

Register and log in:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name": "Ana", "email": "ana@example.com", "password": "supersecret"}'

curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "ana@example.com", "password": "supersecret"}'
# => { "token": "eyJhbGciOi...", "user": { "id": 1, "name": "Ana", ... } }

TOKEN=<token from the login response>
```

Create a ticket:

```bash
curl -i -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title": "Printer on 2nd floor is not working", "description": "Paper jam error", "priority": "alta"}'
```

Response `201 Created`:

```json
{
  "id": 1,
  "title": "Printer on 2nd floor is not working",
  "description": "Paper jam error",
  "priority": "alta",
  "status": "aberto",
  "requester_id": 1,
  "requester_name": "Ana",
  "created_at": "2026-09-21 13:30:00",
  "updated_at": "2026-09-21 13:30:00"
}
```

Comment on it:

```bash
curl -X POST http://localhost:3000/tickets/1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"body": "It started this morning"}'
```

## Routes

| Method | Route                   | Auth | Description                                                   |
| ------ | ----------------------- | ---- | ------------------------------------------------------------- |
| POST   | `/auth/register`        | -    | Create an account (`name`, `email`, `password` with 8+ chars) |
| POST   | `/auth/login`           | -    | Log in, returns `{ token, user }`                             |
| GET    | `/auth/me`              | yes  | Current user                                                  |
| POST   | `/tickets`              | yes  | Create a ticket for the current user (`201`)                  |
| GET    | `/tickets`              | yes  | List tickets (requesters: own only). Query: `status`, `page`, `limit` (max 100) |
| GET    | `/tickets/:id`          | yes  | Ticket detail (`404` if missing, `403` if not yours)          |
| PATCH  | `/tickets/:id`          | yes  | Update `title`, `description`, `priority`; `status` is agents only |
| POST   | `/tickets/:id/comments` | yes  | Add a comment (`body`)                                        |
| GET    | `/tickets/:id/comments` | yes  | List the comments of a ticket                                 |

Allowed values:

- `priority`: `baixa`, `media` (default), `alta`
- `status`: `aberto` (default), `em_andamento`, `resolvido`, `fechado`

Both are also enforced in the database with `CHECK` constraints.

## Errors

Errors are JSON with an `error` message. Validation errors (`422`) also include `fields` with the problems per field:

```json
{ "error": "Validation failed", "fields": { "title": ["Required"] } }
```

## Scripts

| Script            | What it does                        |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the API with reload on change |
| `npm run migrate` | Apply pending migrations            |
| `npm run promote-agent -- <email>` | Give a user the agent role |
| `npm run build`   | Compile TypeScript to `dist/`       |
| `npm start`       | Run the compiled API                |
| `npm run lint`    | ESLint and type check               |
