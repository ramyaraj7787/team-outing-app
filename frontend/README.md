# Team Outing — Frontend

React + Vite frontend for the Team Outing planner. Talks to the .NET API
(`TeamOutingApi`) for all data — no local mock data anymore.

## Run locally

```bash
npm install
cp .env.example .env.local   # then edit if your API isn't on localhost:5000
npm run dev
```

Opens at `http://localhost:5173`. Make sure `TeamOutingApi` is running
(`dotnet run`) at the URL set in `.env.local`.

## Deploy to Vercel (free)

1. Push this folder to a GitHub repo (or its own repo).
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Vercel auto-detects Vite. Framework preset: **Vite**. Build command:
   `npm run build`. Output directory: `dist`.
4. Under **Environment Variables**, add:
   - `VITE_API_BASE` = the URL of your deployed backend, e.g.
     `https://team-outing-api.onrender.com/api`
5. Deploy. You'll get a URL like `https://team-outing.vercel.app` —
   share that with your team.

## Important: deploy the backend first

This frontend is useless without a reachable backend. Before deploying here:
1. Deploy `TeamOutingApi` (see its own README — Render.com free tier works).
2. Update that API's `AllowedOrigins` / CORS policy to allow your Vercel
   domain (`https://team-outing.vercel.app`), not `AllowAnyOrigin` — that
   was only safe while the API was localhost-only.
3. Point `VITE_API_BASE` here at that deployed backend URL.

## Turning this into an installable "app" (PWA) without the Play Store

Once deployed, teammates can open the Vercel URL on their phone and use
"Add to Home Screen" (iOS Safari) or the install prompt (Android Chrome) —
it behaves like an app icon without needing the Play Store. For a fuller
PWA experience (offline support, custom icon), add a manifest + service
worker later via `vite-plugin-pwa`.

## Converting to React Native for the actual Play Store

The API calls, data shapes, and business logic in `App.jsx` carry over
almost directly. What changes: swap `div`/`button`/`input` for React
Native's `View`/`TouchableOpacity`/`TextInput`, and swap inline `style={{}}`
objects for `StyleSheet.create`. The `api()` fetch helper and all handler
functions (addAnnouncement, addScore, shuffleTeams, etc.) can be reused
almost as-is.
