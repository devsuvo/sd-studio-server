# StudioSpace API

The Express + MongoDB REST API behind StudioSpace, a peer-to-peer creative studio booking platform.

Authentication is handled by BetterAuth in the Next.js client. The client stores a short-lived JWT in an **HttpOnly cookie** (`ss_token`) and reaches this API through a same-origin proxy, so the cookie is sent with every request. The API verifies the JWT against the client's JWKS endpoint (`<CLIENT_URL>/api/auth/jwks`) and returns **401 Unauthorized** when it's missing or invalid. A `Authorization: Bearer <token>` header also works, for scripts and tools.

## Tech stack

Express 4 · TypeScript · MongoDB native driver · Zod (validation) · jose (JWT verification) · imgbb (image hosting) · Vercel

Collections: `studios`, `bookings`, `reviews`, `wishlists` (plus BetterAuth's `user`, `session`, `account`, `jwks`).

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
| GET | `/api/studios/mine` | ✔ | Studios owned by the user (matched on `ownerEmail`) |
| GET | `/api/studios/:id/reviews` | – | Reviews, newest first |
| POST | `/api/studios/:id/reviews` | ✔ | Add or update a review (requires a confirmed or completed booking) |
| POST | `/api/studios` | ✔ | Create a studio |
| PATCH | `/api/studios/:id` | ✔ host | Update a studio |
| DELETE | `/api/studios/:id` | ✔ host | Delete (blocked while upcoming bookings exist) |
| POST | `/api/bookings` | ✔ | Save a booking as **Pending** after checking hours, minimum length and overlaps with active bookings |
| GET | `/api/bookings/me` | ✔ | The user's bookings as a guest |
| GET | `/api/bookings/host` | ✔ | Requests for the user's studios |
| GET | `/api/bookings/summary` | ✔ | Dashboard numbers |
| PATCH | `/api/bookings/:id/status` | ✔ | Guest: cancel a pending booking. Host: confirm, decline or cancel |
| GET | `/api/wishlist` | ✔ | Saved studio ids and documents |
| POST | `/api/wishlist/:studioId` | ✔ | Save or unsave a studio |
| POST | `/api/uploads` | ✔ | Upload a base64 image to imgbb and return its URL |

Booking statuses: `pending` → `confirmed` → `completed` (set automatically after the session date), or `declined` / `cancelled`.

## Local setup

```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI, DB_NAME, CLIENT_URL and IMGBB_API_KEY
npm run dev            # http://localhost:5000
```

Seed demo data (the client must be running, because accounts are created through BetterAuth):

```bash
npm run seed
```

This creates `guest@sdstudio.dev / Guest@12345`, `host@sdstudio.dev / Host@12345` and `daniel@sdstudio.dev / Host@12345`, plus nine studios, sample bookings and reviews. Running it again replaces the demo data instead of duplicating it.

## Deploy to Vercel

`vercel.json` routes every request to `src/index.ts`. Set `MONGODB_URI`, `DB_NAME`, `CLIENT_URL` (the deployed client URL) and `IMGBB_API_KEY` in the project's environment variables.
