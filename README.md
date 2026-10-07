# SWGC Room Chats

A SWGC Room Chats interface using the SWG orange and white visual style.

## Current Build

The frontend includes:

- SWGC Room Chats interface
- SWG logo branding
- Orange and white visual design
- Realtime chat with Supabase
- Anonymous chat sessions
- Unique username checking
- Separate display name
- Editable profile note
- Profile avatar upload
- Public profile viewing
- Responsive mobile layout
- Server-side troubleshooting email delivery
- No client-side support email or email API secret

## Supabase Setup

Create a Supabase project, enable Anonymous Sign-Ins, and run supabase/schema.sql in the SQL Editor.

Add these Vercel Environment Variables:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPPORT_EMAIL
- RESEND_API_KEY
- RESEND_FROM

The browser receives only the Supabase project URL and publishable key through /api/config. The publishable key is intended for browser use and database access is protected by RLS. Never put a Supabase secret key, Resend API key, or support Gmail address in frontend code.

The avatars Storage bucket and its access policies are created by supabase/schema.sql.

## Troubleshooting Email

The browser sends troubleshooting requests only to the same-origin API endpoint:

/api/troubleshoot

The support Gmail address and email provider API key stay on the server in Vercel Environment Variables.

## Deployment

Deploy the repository with Vercel and configure the environment variables before testing the realtime chat.

Supabase Realtime uses database change subscriptions for low-latency message delivery. The current implementation uses Postgres Changes because it is simple and suitable for a small public room. Supabase documents Broadcast as the more scalable option for larger realtime workloads.