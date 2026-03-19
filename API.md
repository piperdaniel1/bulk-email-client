# External API

## Authentication

All API requests use Bearer authentication:

```
Authorization: Bearer bec_<key>
```

API keys are generated from the web UI's Settings page. The raw key is shown once on creation and cannot be retrieved again.

## Base URL

```
https://<your-netlify-site>/api
```

## Error Format

All errors return JSON:

```json
{
  "error": "Human-readable error message"
}
```

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad request (missing/invalid fields) |
| 401  | Unauthorized (missing, invalid, or revoked API key) |
| 404  | Resource not found (or not owned by this account) |
| 405  | Method not allowed (must be POST) |
| 409  | Conflict (duplicate resource) |
| 500  | Internal server error |

---

## `POST /api/api-folders-create`

Create a new folder for organizing email addresses.

**Request:**

```json
{
  "name": "My Folder"
}
```

| Field  | Type   | Required | Constraints |
|--------|--------|----------|-------------|
| `name` | string | yes      | 1-100 chars (trimmed) |

**Response (201):**

```json
{
  "folder": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Folder",
    "sort_order": 3,
    "created_at": "2026-03-19T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` — `"Name is required"` or `"Name must be 100 characters or less"`

**curl example:**

```bash
curl -X POST https://<site>/api/api-folders-create \
  -H "Authorization: Bearer bec_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"name": "My Folder"}'
```

---

## `POST /api/api-folders-list`

List all folders on the account, ordered by sort order.

**Request:** empty body or `{}`

**Response (200):**

```json
{
  "folders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Folder",
      "sort_order": 0,
      "created_at": "2026-03-19T12:00:00.000Z"
    }
  ]
}
```

**curl example:**

```bash
curl -X POST https://<site>/api/api-folders-list \
  -H "Authorization: Bearer bec_abc123..."
```

---

## `POST /api/api-addresses-create`

Create a new email address. The domain is set server-side and cannot be overridden.

**Request:**

```json
{
  "local_part": "my-address",
  "display_name": "My Display Name",
  "folder_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field          | Type        | Required | Constraints |
|----------------|-------------|----------|-------------|
| `local_part`   | string      | yes      | Lowercase letters, numbers, dots, underscores, hyphens only (`/^[a-z0-9._-]+$/`). Max 64 chars. Auto-lowercased and trimmed. |
| `display_name` | string      | no       | Max 255 chars. Trimmed. Null if omitted. |
| `folder_id`    | string/null | no       | UUID of a folder owned by this account. Null or omit for unfiled. |

**Response (201):**

```json
{
  "address": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "local_part": "my-address",
    "domain": "setdomain.com",
    "display_name": "My Display Name",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "sort_order": 0,
    "created_at": "2026-03-19T12:02:00.000Z",
    "updated_at": "2026-03-19T12:02:00.000Z"
  }
}
```

The full email address is `{local_part}@{domain}`.

**Errors:**
- `400` — `"local_part is required"`, `"Invalid local_part format"`, `"local_part must be 64 characters or less"`
- `404` — `"Folder not found"` (folder_id doesn't exist or isn't owned by this account)
- `409` — `"Email address already exists"` (local_part + domain combination taken)

**curl example:**

```bash
curl -X POST https://<site>/api/api-addresses-create \
  -H "Authorization: Bearer bec_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"local_part": "hello", "folder_id": "550e8400-..."}'
```

---

## `POST /api/api-addresses-list`

List email addresses on the account. Optionally filter by folder.

**Request:**

```json
{
  "folder_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field       | Type             | Required | Behavior |
|-------------|------------------|----------|----------|
| `folder_id` | string/null/omit | no       | UUID: addresses in that folder. `null`: unfiled addresses only. Omit field entirely: all addresses. |

**Response (200):**

```json
{
  "addresses": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "local_part": "my-address",
      "domain": "setdomain.com",
      "display_name": "My Display Name",
      "folder_id": "550e8400-e29b-41d4-a716-446655440000",
      "sort_order": 0,
      "created_at": "2026-03-19T12:02:00.000Z",
      "updated_at": "2026-03-19T12:02:00.000Z"
    }
  ]
}
```

**curl examples:**

```bash
# All addresses
curl -X POST https://<site>/api/api-addresses-list \
  -H "Authorization: Bearer bec_abc123..."

# Addresses in a specific folder
curl -X POST https://<site>/api/api-addresses-list \
  -H "Authorization: Bearer bec_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "550e8400-..."}'

# Unfiled addresses only
curl -X POST https://<site>/api/api-addresses-list \
  -H "Authorization: Bearer bec_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"folder_id": null}'
```

---

## Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/api-folders-create` | POST | Create a folder |
| `/api/api-folders-list` | POST | List all folders |
| `/api/api-addresses-create` | POST | Create an email address |
| `/api/api-addresses-list` | POST | List email addresses (optionally by folder) |
