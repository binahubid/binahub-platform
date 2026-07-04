# API Reference

Base URL: `https://api.binahub.id` (dev: `http://localhost:4000`)

## Authentication

All protected endpoints require `Authorization: Bearer <supabase-access-token>`.

## Endpoints

### Auth
| Method | Path               | Description          |
|--------|--------------------|----------------------|
| POST   | /api/auth/register | Register new account |
| POST   | /api/auth/login    | Login                |
| POST   | /api/auth/logout   | Logout               |

### Associates
| Method | Path                     | Description                |
|--------|--------------------------|----------------------------|
| GET    | /api/associates          | List associates (admin)    |
| GET    | /api/associates/:id      | Get associate detail       |
| POST   | /api/associates          | Create associate profile   |
| PATCH  | /api/associates/:id      | Update associate profile   |
| GET    | /api/associates/me       | Get current user profile   |

### Documents
| Method | Path                     | Description          |
|--------|--------------------------|----------------------|
| POST   | /api/upload/cv           | Upload CV            |
| POST   | /api/upload/certificate  | Upload certificate   |
| DELETE | /api/documents/:id       | Delete document      |

### Admin
| Method | Path                     | Description             |
|--------|--------------------------|-------------------------|
| GET    | /api/admin/associates    | List all associates     |
| GET    | /api/admin/associates/:id| Full associate detail   |
| PATCH  | /api/admin/associates/:id/review | Review associate |
| GET    | /api/admin/stats         | Dashboard statistics    |
