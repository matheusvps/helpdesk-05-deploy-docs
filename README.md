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

# 2. Configure the environment (port and database file)
cp .env.example .env

# 3. Create the database and apply the migrations
npm run migrate

# 4. Start the API (http://localhost:3000)
npm run dev
```

For a production-like run: `npm run build && npm start`.

`npm run migrate` only applies migrations that were not applied yet (they are tracked in the `schema_migrations` table), so it is safe to run it again after pulling new migrations.

## Example requests

Create a ticket:

```bash
curl -i -X POST http://localhost:3000/tickets \
  -H 'Content-Type: application/json' \
  -d '{"title": "Printer on 2nd floor is not working", "description": "Paper jam error", "priority": "alta", "requester_name": "Ana"}'
```

Response `201 Created`:

```json
{
  "id": 1,
  "title": "Printer on 2nd floor is not working",
  "description": "Paper jam error",
  "priority": "alta",
  "status": "aberto",
  "requester_name": "Ana",
  "created_at": "2026-09-10 22:30:00",
  "updated_at": "2026-09-10 22:30:00"
}
```

Comment on it:

```bash
curl -X POST http://localhost:3000/tickets/1/comments \
  -H 'Content-Type: application/json' \
  -d '{"author": "Bruno", "body": "Checking it now"}'
```

## Routes

| Method | Route                   | Description                                                   |
| ------ | ----------------------- | ------------------------------------------------------------- |
| POST   | `/tickets`              | Create a ticket (`201`)                                       |
| GET    | `/tickets`              | List tickets. Query: `status`, `page` (default 1), `limit` (default 20, max 100) |
| GET    | `/tickets/:id`          | Ticket detail (`404` if it does not exist)                    |
| PATCH  | `/tickets/:id`          | Update `title`, `description`, `priority` and/or `status`     |
| POST   | `/tickets/:id/comments` | Add a comment (`author`, `body`)                              |
| GET    | `/tickets/:id/comments` | List the comments of a ticket                                 |

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
| `npm run build`   | Compile TypeScript to `dist/`       |
| `npm start`       | Run the compiled API                |
| `npm run lint`    | ESLint and type check               |
