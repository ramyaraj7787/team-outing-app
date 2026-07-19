# Team Outing API

.NET 8 Web API backend for the Team Outing planner. Ships with SQLite (zero setup)
and seeds sample data matching the frontend prototype on first run.

## Run locally

```bash
cd TeamOutingApi
dotnet restore
dotnet run
```

- Swagger UI: `https://localhost:5001/swagger` (or whatever port the console prints)
- SQLite file `teamouting.db` is created automatically in the project folder.

## Authentication

Login is phone number + OTP, no passwords. There's no SMS provider connected
yet, so the OTP is returned directly in the `request-otp` response (field
`devOtp`) instead of being texted — clearly marked as dev mode. Swap in a
real provider (Twilio, MSG91, etc.) inside `AuthController.RequestOtp` when
you're ready; everything else (sessions, roles, trip access) already works
for real.

The **first person ever to register becomes Admin automatically** — that's
how the app bootstraps without a seed script.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/request-otp` | `{ phoneNumber }` → generates a code |
| POST | `/api/auth/verify-otp` | `{ phoneNumber, code, name? }` → verifies, registers if new, returns `{ token, member }` |
| GET | `/api/auth/me` | Current user from the bearer token |
| POST | `/api/auth/logout` | Invalidates the current session token |

All other endpoints below require `Authorization: Bearer {token}`.

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/members` | any | Full company roster |
| POST | `/api/members/preadd` | Admin | Pre-add someone by phone before they register |
| PUT | `/api/members/{id}/role` | Admin | Promote/demote `{ role: "Admin" \| "Member" }` |
| DELETE | `/api/members/{id}` | Admin | Remove from company entirely |
| GET | `/api/trips` | any | Trips **the caller participates in** |
| GET | `/api/trips/{id}` | participant | Full trip detail — 403 if not a participant |
| POST | `/api/trips` | Admin | Create a trip (creator auto-added as participant) |
| POST | `/api/trips/{id}/participants` | Admin | Add an existing member to the trip |
| POST | `/api/trips/{id}/participants/by-phone` | Admin | Add by phone even if unregistered |
| DELETE | `/api/trips/{id}/participants/{memberId}` | Admin | Remove from the trip |
| POST/PUT/DELETE | `/api/trips/{id}/itinerary/...` | Admin | Schedule CRUD |
| POST | `/api/trips/{id}/announcements` | Admin, participant | Post an update |
| POST | `/api/trips/{id}/photos` | any participant | Share a photo |
| POST | `/api/trips/{tripId}/games` | Admin | Create a game with teams |
| POST | `/api/trips/{tripId}/games/{gameId}/score` | Admin | Add points |
| POST | `/api/trips/{tripId}/games/{gameId}/shuffle` | Admin | Reshuffle teams |

## Deploying for free (so your team can actually use it)

### One-click deploy (recommended)

Once this code is pushed to a GitHub repo, add this to your repo's README —
replace `YOUR_USERNAME/YOUR_REPO` with your actual repo path:

```markdown
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/YOUR_REPO)
```

Clicking it reads `render.yaml` (already included) and provisions the web
service automatically via Docker. You'll be prompted in Render's UI to fill
in a few values it can't guess:
- `DATABASE_URL` — a Postgres connection string (see Neon setup below)
- `ALLOWED_ORIGINS` — your frontend's URL, once you have one (Step 2)
- `TWILIO_*` — optional, only needed for real SMS (see "Introducing real OTP" below)

**Get a free Postgres database first** (takes 1 minute): go to
[neon.tech](https://neon.tech) → sign up → New Project → copy the connection
string (starts with `postgres://`) → that's your `DATABASE_URL`.

### Manual deploy (same result, more control)

1. Push this folder to a GitHub repo.
2. On Render: New → Web Service → connect the repo → Render detects the
   `Dockerfile` automatically.
3. Add the same environment variables listed above.
4. Deploy.

**Photos**
- This API stores only a photo `Url` string, not the image bytes.
- Use Supabase Storage or Cloudinary (both free tiers) to upload the actual image,
  then save the returned URL via `POST /api/trips/{id}/photos`.
