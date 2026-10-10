# SWGC Server

This branch contains server-side code and backend database setup for Scratch Would Global Chat.

## Contents

- `api/`: Vercel serverless endpoints for public configuration, Tenor stickers, and troubleshooting email.
- `supabase/schema.sql`: Supabase database schema, policies, and storage setup.
- `server/`: Legacy standalone Node.js/WebSocket chat server. The current frontend architecture uses Supabase Realtime; do not deploy this legacy server as the active chat backend unless the frontend is explicitly migrated to it.

## Vercel API deployment

Deploy this branch as a separate Vercel project with the repository root as the Root Directory. Configure these environment variables in the Vercel project as needed:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `TENOR_API_KEY`
- `TENOR_CLIENT_KEY` (optional)
- `KLIPY_API_KEY` (optional)
- `SUPPORT_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM`

Only the Supabase publishable key is intended to be exposed to browser clients. Never expose Supabase secret/service-role keys or email provider API keys in frontend code.

## Supabase

The Supabase project remains separate from Git branches. Applying `supabase/schema.sql` changes the database; switching branches alone does not change the live Supabase database.

## Important migration note

The current frontend in `main` calls same-origin `/api/*` endpoints. Deploying this branch separately does not automatically redirect those requests. Update the frontend API base URL and configure CORS before removing the API routes from the frontend deployment. Keep the copies in `main` until the separate backend deployment has been tested.
