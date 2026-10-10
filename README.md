# SWGC API Server

This branch separates server-side API code from the frontend on `main`.

## Deploy on Render

- Repository: `FeaturedPr0ject/scratch-would-global-chat`
- Branch: `server`
- Root Directory: leave blank
- Build Command: `npm install`
- Start Command: `npm start`

## Required environment variables

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for account recovery and Owner Login)
- `OWNER_LOGIN_CODE` (a long, unique secret configured privately on Render; never expose it in frontend code)
- `KLIPY_API_KEY`
- `SUPPORT_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `FRONTEND_ORIGINS`: comma-separated allowed frontend origins. Leave empty to allow any origin, or set it to the production frontend origin(s).

Never put Supabase secret/service-role keys or Resend API keys in frontend code. The server uses each signed-in user's access token for database operations so Supabase Row Level Security remains active.

## Routes

- `GET /health`
- `GET /api/config`
- `GET /api/stickers?q=...`
- `POST /api/auth/owner-login` — validates the Render-configured Owner code and signs in the existing profile `01`.
- `POST /api/auth/recovery-code` — creates a cross-device recovery code for the current anonymous account.
- `POST /api/auth/recover` — restores the matching Supabase account using its recovery code.
- `POST /api/troubleshoot`
- Profile, username, friend, group, and message API routes used by the frontend.

## Supabase

The Supabase project and live data remain unchanged. Realtime subscriptions and file storage continue to use the Supabase client in the frontend; profile, message, friend, group, sticker-search, and support-email HTTP requests go through this server.

The previous JSON-file WebSocket server remains under `server/` as legacy code and is not used by this API.


## Owner Login and account recovery

Set `OWNER_LOGIN_CODE` and `SUPABASE_SERVICE_ROLE_KEY` in the Render service environment. The Owner profile with username `01` must already exist. Redeploy after setting the variables. The service-role key must never be added to frontend files or sent in chat. Recovery codes are generated from the signed-in anonymous account and should be saved privately; generating a new code replaces the previous one. These endpoints require the Supabase service-role key because the app currently uses anonymous Auth accounts.
