# Help desk API reference

Base URL: `http://localhost:3000` locally, or the URL of the `helpdesk-api` service when deployed.

All bodies are JSON (`Content-Type: application/json`). Dates are UTC strings in the format `YYYY-MM-DD HH:MM:SS`.

## Authentication

Ticket and comment routes require a token from `POST /auth/login`:

```
Authorization: Bearer <token>
```

Tokens expire after 8 hours. There is no logout route: the client discards the token.

### Roles

| Role          | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| `solicitante` | Requester. Default for every new account. Sees only their own tickets.  |
| `atendente`   | Agent. Sees every ticket and is the only role that changes the status.  |

The **Role** line of each route below says who may call it. "Any" means any logged-in user.

## Errors

Every error has the same shape:

```json
{ "error": "Validation failed", "fields": { "title": ["Title is required"] } }
```

`fields` is only present on validation errors.

| Status | When                                                                   |
| ------ | ---------------------------------------------------------------------- |
| `400`  | The body is not valid JSON                                             |
| `401`  | Missing, invalid or expired token; wrong email or password on login    |
| `403`  | The user is logged in but cannot access this ticket or action          |
| `404`  | Ticket or route not found                                              |
| `409`  | Email already registered; status change outside the allowed flow       |
| `422`  | Body or query parameters failed validation (see `fields`)              |
| `500`  | Unexpected error                                                       |

---

## Auth routes

### `POST /auth/register`

Creates an account with role `solicitante`. **Role:** public.

Body:

| Field      | Type   | Required | Notes                         |
| ---------- | ------ | -------- | ----------------------------- |
| `name`     | string | yes      |                               |
| `email`    | string | yes      | Unique, stored in lower case  |
| `password` | string | yes      | At least 8 characters         |

Responses:

- `201` the created user: `{ "id": 1, "name": "Ana", "email": "ana@example.com", "role": "solicitante" }`
- `409` email already registered
- `422` invalid fields

### `POST /auth/login`

**Role:** public.

Body: `{ "email": string, "password": string }`

Responses:

- `200` `{ "token": "eyJ...", "user": { "id": 1, "name": "Ana", "email": "ana@example.com", "role": "solicitante" } }`
- `401` `{ "error": "Invalid email or password" }`
- `422` missing fields

### `GET /auth/me`

Returns the logged-in user. **Role:** any.

Responses: `200` user object, `401`.

---

## Ticket routes

A ticket:

```json
{
  "id": 1,
  "title": "Printer on 2nd floor is jammed",
  "description": "Paper jam error",
  "priority": "alta",
  "status": "aberto",
  "requester_id": 2,
  "requester_name": "Ana Souza",
  "created_at": "2026-10-30 12:00:00",
  "updated_at": "2026-10-30 12:00:00"
}
```

- `priority`: `baixa`, `media`, `alta`
- `status`: `aberto`, `em_andamento`, `resolvido`, `fechado`

### `POST /tickets`

Opens a ticket for the logged-in user, with status `aberto`. **Role:** any (`solicitante` or `atendente`).

Body:

| Field         | Type   | Required | Default |
| ------------- | ------ | -------- | ------- |
| `title`       | string | yes      |         |
| `description` | string | no       | `""`    |
| `priority`    | string | no       | `media` |

Responses: `201` the ticket, `401`, `422` (e.g. missing title).

### `GET /tickets`

Lists tickets, newest first. **Role:** `solicitante` gets only their own tickets; `atendente` gets all tickets.

Query parameters:

| Param    | Type    | Default | Notes                  |
| -------- | ------- | ------- | ---------------------- |
| `status` | string  | (all)   | One of the four values |
| `page`   | integer | `1`     | Starts at 1            |
| `limit`  | integer | `20`    | 1 to 100               |

Responses:

- `200` `{ "items": [ticket, ...], "page": 1, "limit": 20, "total": 42 }`
- `401`
- `422` invalid query parameter

### `GET /tickets/:id`

**Role:** the requester who opened the ticket, or `atendente`.

Responses: `200` the ticket, `401`, `403` ticket of another requester, `404`.

### `PATCH /tickets/:id`

Updates one or more fields. **Role:** the requester who opened the ticket may change `title`, `description` and `priority`; only `atendente` may change `status` (on any ticket).

Body (at least one field):

| Field         | Type   |
| ------------- | ------ |
| `title`       | string (not empty) |
| `description` | string |
| `priority`    | string |
| `status`      | string |

Status changes must follow this flow:

| From           | To                                   |
| -------------- | ------------------------------------ |
| `aberto`       | `em_andamento`                       |
| `em_andamento` | `resolvido`                          |
| `resolvido`    | `fechado` or `em_andamento` (reopen) |
| `fechado`      | none                                 |

Responses:

- `200` the updated ticket
- `401`
- `403` ticket of another requester, or a requester trying to change `status`
- `404`
- `409` `{ "error": "Status transition not allowed: fechado -> aberto", "from": "fechado", "to": "aberto" }`
- `422` invalid fields or empty body

---

## Comment routes

A comment:

```json
{
  "id": 3,
  "ticket_id": 1,
  "author_id": 1,
  "author_name": "Carla Atendente",
  "body": "Thanks, we are looking into it.",
  "created_at": "2026-10-30 12:05:00"
}
```

### `GET /tickets/:id/comments`

Lists the comments of a ticket, oldest first. **Role:** the requester who opened the ticket, or `atendente`.

Responses: `200` array of comments, `401`, `403`, `404`.

### `POST /tickets/:id/comments`

Adds a comment as the logged-in user. **Role:** the requester who opened the ticket, or `atendente`.

Body: `{ "body": string }` (required, not empty)

Responses: `201` the comment, `401`, `403`, `404`, `422`.

---

## Other

### `GET /health`

Public. `200` `{ "ok": true }`. Used by the deploy health check.
