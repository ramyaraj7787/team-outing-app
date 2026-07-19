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

**Backend — Render.com (free tier)**
1. Push this folder to a GitHub repo.
2. On Render: New → Web Service → connect the repo.
3. Runtime: Docker, or "Native" with build command `dotnet publish -c Release -o out`
   and start command `dotnet out/TeamOutingApi.dll`.
4. Add environment variable `ASPNETCORE_URLS=http://0.0.0.0:10000` (Render's expected port).
5. SQLite works but Render's free disk isn't guaranteed persistent across deploys —
   for anything beyond a demo, switch to Postgres (see below).

**Swap in Supabase Postgres (recommended for a real shared team app)**
1. Create a free Supabase project → copy the connection string.
2. `dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL`
3. In `Program.cs`, replace `UseSqlite(...)` with:
   ```csharp
   options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"))
   ```
4. Put the Supabase connection string in `appsettings.json` under `ConnectionStrings:Postgres`
   (or better, as an environment variable / Render secret).

**Frontend**
- Deploy the React prototype to Vercel or Netlify (free).
- Replace the in-memory `useState` data with `fetch` calls to this API's base URL.
- Update `AllowedOrigins` in `appsettings.json` to your deployed frontend URL.

**Photos**
- This API stores only a photo `Url` string, not the image bytes.
- Use Supabase Storage or Cloudinary (both free tiers) to upload the actual image,
  then save the returned URL via `POST /api/trips/{id}/photos`.
