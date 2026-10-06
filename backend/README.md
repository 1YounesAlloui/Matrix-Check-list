# Matrix Backend — Django REST API

## Stack
- **Django 6.1** + **Django REST Framework**
- **SimpleJWT** for authentication
- **drf-spectacular** for OpenAPI docs
- **django-cors-headers** for CORS
- **SQLite** (dev) / **PostgreSQL** (prod via `DATABASE_URL`)

## Quick Start

```bash
# 1. Create and activate virtualenv (from backend/)
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/macOS

# 2. Install dependencies
pip install djangorestframework djangorestframework-simplejwt \
    django-cors-headers drf-spectacular python-dotenv

# 3. Configure environment
# Edit .env (already has a dev SECRET_KEY)

# 4. Run migrations
python backend/manage.py migrate

# 5. Create a superuser (optional)
python backend/manage.py createsuperuser

# 6. Seed demo data
python backend/manage.py seed_demo

# 7. Run server
python backend/manage.py runserver
```

## API Docs
Visit `http://localhost:8000/api/docs/` for interactive Swagger UI.

## Endpoint Table

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/register/` | ❌ | Register |
| POST | `/api/auth/login/` | ❌ | Login → JWT |
| POST | `/api/auth/refresh/` | ❌ | Refresh token |
| GET | `/api/auth/me/` | ✅ | Current user |
| GET | `/api/plans/` | ✅ | List plans |
| POST | `/api/plans/` | ✅ | Create plan |
| GET | `/api/plans/{id}/` | ✅ | Get plan |
| PATCH | `/api/plans/{id}/` | ✅ | Update plan |
| DELETE | `/api/plans/{id}/` | ✅ | Delete plan |
| POST | `/api/plans/{id}/duplicate/` | ✅ | Duplicate plan |
| POST | `/api/plans/reorder/` | ✅ | Reorder plans |
| GET | `/api/tasks/` | ✅ | List tasks (`?plan=`) |
| POST | `/api/tasks/` | ✅ | Create task |
| PATCH | `/api/tasks/{id}/` | ✅ | Update task |
| DELETE | `/api/tasks/{id}/` | ✅ | Delete task |
| POST | `/api/tasks/reorder/` | ✅ | Reorder tasks |
| POST | `/api/completions/toggle/` | ✅ | Toggle task completion |
| GET | `/api/today/` | ✅ | Today's view (`?date=`) |
| GET | `/api/calendar/` | ✅ | Calendar range (`?start=&end=&plan=`) |
| GET | `/api/matrix/` | ✅ | Matrix grid (`?start=&end=`) |
| GET | `/api/stats/summary/` | ✅ | Stats (`?start=&end=&plan=`) |
| GET | `/api/insights/` | ✅ | Smart insights (`?start=&end=`) |
| GET/POST | `/api/skips/` | ✅ | List/create skip days |
| DELETE | `/api/skips/{id}/` | ✅ | Delete skip day |
| GET/PUT/PATCH | `/api/notes/{date}/` | ✅ | Day notes |
| GET | `/api/export/` | ✅ | Full JSON export |
| POST | `/api/import/` | ✅ | Import JSON |
| GET | `/api/templates/` | ✅ | Built-in templates |
| POST | `/api/templates/{key}/apply/` | ✅ | Create plan from template |
| GET | `/api/docs/` | ❌ | Swagger UI |

## Running Tests

```bash
python backend/manage.py test matrix.tests --verbosity=2
```

## PostgreSQL Setup

Uncomment `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgres://user:password@localhost:5432/matrix_db
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | dev key | Django secret key |
| `DEBUG` | `True` | Debug mode |
| `ALLOWED_HOSTS` | `*` | Comma-separated hosts |
| `DATABASE_URL` | SQLite | PostgreSQL connection URL |
