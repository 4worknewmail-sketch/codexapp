# Django backend setup (SQLite + SimpleJWT + Stripe)

## Prerequisites on Ubuntu VPS

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv build-essential nginx
```

If Node is not available for the Vite frontend:

```bash
sudo apt install -y nodejs npm
npm install -g pnpm
```

## Project bootstrap

```bash
cd /path/to/codexapp
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

codex/summarize-project-features-and-implementations
### Quick local smoke test (while running Vite dev server)

In one terminal tab for the backend:

```bash
python backend/manage.py migrate
python backend/manage.py runserver 0.0.0.0:8000
```

In a second terminal tab for the frontend (API base defaults to `http://localhost:8000`):

```bash
pnpm install
pnpm dev
```

If your API lives elsewhere, set `VITE_API_BASE_URL` before running the frontend:

```bash
VITE_API_BASE_URL=https://api.example.com pnpm dev
```

main
## Database + admin

```bash
python backend/manage.py migrate
python backend/manage.py createsuperuser  # optional admin account
```

## Running the API (simple)

```bash
python backend/manage.py runserver 0.0.0.0:8000
```

## Gunicorn (optional, behind nginx)

```bash
source venv/bin/activate
gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:8000
```

Create an nginx site that proxies to `http://127.0.0.1:8000` and serves the Vite `dist/` folder if desired.

## Environment keys

Create `backend/.env` (or export vars) when you’re ready to accept payments:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PAYMENT_SUCCESS_URL=https://yourdomain.com/payment-success
PAYMENT_CANCEL_URL=https://yourdomain.com/payment-cancel
```

## Seeding leads from CSV

The editable CSV lives at `backend/data/seed_leads.csv`. With an authenticated request, call:

```bash
curl -X POST http://localhost:8000/api/import/seed/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Auth endpoints (SimpleJWT)
- `POST /api/auth/register/` — body `{ "email", "password" }`
- `POST /api/auth/login/` — body `{ "email", "password" }`
- `POST /api/auth/refresh/` — body `{ "refresh" }`
- `GET /api/auth/me/` — returns `{ email, credits }`

## Leads + credits
- `GET /api/leads/` — list authenticated user’s leads
- `POST /api/leads/import/` — body `{ leads: [...] }` to store JSON leads
- `POST /api/import/seed/` — loads `backend/data/seed_leads.csv` for the logged-in user
- `GET /api/leads/export/?format=csv` — export current user’s leads
- `POST /api/leads/unlock/` — body `{ lead_id, type: "email" | "phone" }` (deducts credits)
- `POST /api/credits/checkout/` — body `{ amount, credits }` creates Stripe Checkout URL (card + Apple Pay via Wallet)
- `POST /api/credits/confirm/` — body `{ session_id, credits }` adds credits (no webhooks in this minimal setup)

New accounts start with **25 credits**; unlock email costs 1 credit, unlock phone costs 2 credits.
