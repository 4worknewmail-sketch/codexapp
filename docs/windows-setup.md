# Windows quickstart (Command Prompt or PowerShell)

Follow these copy/paste commands to install the prerequisites and run both the Django backend and Vite frontend on Windows. Replace `C:\path\to\project` with your local folder.

## 1) Install runtimes

**Python 3** (Command Prompt or PowerShell):
```bat
winget install -e --id Python.Python.3.12
```
After install, restart the shell and verify:
```bat
python --version
pip --version
```

**Node + pnpm** (if you only have npm):
```bat
npm install -g pnpm
```
(If Node is missing, install from https://nodejs.org first.)

## 2) Set up the backend (Django + DRF + SimpleJWT)

From the project root:
```bat
cd C:\path\to\project
python -m venv venv
venv\Scripts\activate
pip install -r backend\requirements.txt
python backend\manage.py migrate
python backend\manage.py runserver 0.0.0.0:8000
```
Leave `runserver` running; it serves the API for signup/login, leads, credits, and Stripe checkout.

## 3) Set up the frontend (Vite + React)

In a new shell (backend still running):
```bat
cd C:\path\to\project
pnpm install
pnpm dev
```
Then open the printed localhost URL. The frontend expects the API at `http://localhost:8000` by default; set `VITE_API_BASE_URL` if you change the port.

## 4) Stripe keys (when ready)

Create `backend/.env` with your keys:
```bat
echo STRIPE_PUBLISHABLE_KEY=pk_test_...>> backend\.env
echo STRIPE_SECRET_KEY=sk_test_...>> backend\.env
```
Restart `runserver` after adding keys. Apple Pay and card payments use Stripe’s test mode until you supply live keys.

## 5) Common checks

- If signup/login hangs, ensure the backend shell is running `python backend\manage.py runserver 0.0.0.0:8000`.
- To reset the DB locally, stop the server, delete `backend\db.sqlite3`, rerun `python backend\manage.py migrate`, and restart.
- To install backend deps again after recreating the venv: `venv\Scripts\activate` then `pip install -r backend\requirements.txt`.
