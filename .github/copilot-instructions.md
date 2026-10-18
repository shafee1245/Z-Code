# QR Studio Workspace Notes

- The frontend is a Next.js App Router app in `apps/web`; keep page styling consistent with its CSS variables and component patterns.
- The API is FastAPI in `apps/api`; run it from the repository root with `npm run dev:api` or from that folder with `uvicorn src.main:app --reload`.
- Auth persistence, scan-event storage/aggregation, and Stripe event handling are integration points, not production features yet.
- Keep secrets in `.env`; commit only `.env.example` with non-production defaults.
- Run `npm run build` for the web build and `npm run test:api` for API tests.
