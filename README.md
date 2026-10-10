# SWGC Room Chats

The frontend for SWGC Room Chats. Backend HTTP endpoints live on the `server` branch.

## Frontend

- `index.html`, `app.js`, and `style.css` provide the responsive chat UI.
- Supabase Auth initializes anonymous sessions in the browser.
- Supabase Realtime and Storage remain connected directly from the browser.
- Profile, message, friend, group, sticker-search, and support-email HTTP requests use the backend API.

## Backend API

The API source is maintained on the [`server` branch](https://github.com/FeaturedPr0ject/scratch-would-global-chat/tree/server).

Set the backend service URL in `app.js` as `SERVER_API_BASE`. The current value is `https://swgc-chat-server.onrender.com`.

Deploy the `server` branch as a separate Render service using the repository root, `npm install` as the build command, and `npm start` as the start command.

Configure these environment variables on the backend service:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `KLIPY_API_KEY`
- `SUPPORT_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `FRONTEND_ORIGINS` (optional comma-separated allowed frontend origins)

Never put Supabase secret/service-role keys or email provider API keys in frontend code. The backend uses the signed-in user's access token so Supabase Row Level Security remains active.

## Supabase Setup

The live Supabase project and its data are not moved by changing Git branches. If the database schema needs to be set up, use `supabase/schema.sql` from the `server` branch in the Supabase SQL Editor only when appropriate; do not rerun it blindly on a live project.

## Deployment note

Configure the Render service to use branch `server` and leave Root Directory blank. Keep the frontend deployment on `main`. Test login, profiles, messages, friends, groups, stickers, file uploads, and troubleshooting email after deploying.
