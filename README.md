# SD Studio API

The Express + MongoDB REST API behind SD Studio, a peer-to-peer creative studio booking platform.

Authentication is handled by BetterAuth in the Next.js client. The client sends a short-lived JWT as `Authorization: Bearer <token>`, and this API verifies it against the client's JWKS endpoint (`<CLIENT_URL>/api/auth/jwks`).

## Tech stack

Express 4 · TypeScript · MongoDB native driver · Zod (validation) · jose (JWT verification) · Vercel

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | – | Health check |
| GET | `/api/stats` | – | Studio, city, host and booking counts |
| GET | `/api/studios` | – | Search, filter (`search`, `category`, `city`, `minPrice`, `maxPrice`, `capacity`), sort, paginate |
| GET | `/api/studios/featured` | – | Top rated studios |
| GET | `/api/studios/cities` | – | Distinct cities |
| GET | `/api/studios/:id` | – | Studio details |
| GET | `/api/studios/:id/availability?date=YYYY-MM-DD` | – | Booked hours for a date |
| GET | `/api/studios/mine` | ✔ | Studios owned by the user |
| POST | `/api/studios` | ✔ | Create a studio |
| PATCH | `/api/studios/:id` | ✔ host | Update a studio |
| DELETE | `/api/studios/:id` | ✔ host | Delete (blocked while upcoming bookings exist) |
| POST | `/api/bookings` | ✔ | Request a booking (checks hours, minimum length and overlaps) |
| GET | `/api/bookings/me` | ✔ | The user's bookings as a guest |
| GET | `/api/bookings/host` | ✔ | Requests for the user's studios |
| GET | `/api/bookings/summary` | ✔ | Dashboard numbers |
| PATCH | `/api/bookings/:id/status` | ✔ | Guest: cancel. Host: confirm, decline or cancel |

## Local setup

```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, DB_NAME and CLIENT_URL
npm run dev            # http://localhost:5000
```

Seed demo data (the client must be running, because accounts are created through BetterAuth):

```bash
npm run seed
```

This creates `guest@sdstudio.dev / Guest@12345`, `host@sdstudio.dev / Host@12345` and `daniel@sdstudio.dev / Host@12345`, plus nine studios and sample bookings.

## Deploy to Vercel

`vercel.json` routes every request to `src/index.ts`. Set `MONGODB_URI`, `DB_NAME` and `CLIENT_URL` (the deployed client URL) in the project's environment variables.
