# Local test attempt summary

- Backend dependencies installed via `pip install -r backend/requirements.txt`.
- `python backend/manage.py migrate --noinput` succeeds (SQLite).
- Backend regression suite: `python backend/manage.py test api -v 2` passes (auth, leads import/export, unlock, saved lists, Stripe key validation).
- Frontend checks: `pnpm test -- --runInBand` passes; `pnpm build` succeeds for SPA and server bundles.
- TypeScript typecheck intentionally skipped per user request (can be run locally with `pnpm typecheck`).
