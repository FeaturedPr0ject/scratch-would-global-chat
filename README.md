# SWGC Room Chats

A SWGC Room Chats interface using the SWG orange and white visual style.

## Current Build

The frontend includes:

- SWGC Room Chats interface
- SWG logo branding
- Orange and white visual design
- Display name selection
- Message composer
- Responsive mobile layout
- Local demo message storage
- Server-side troubleshooting email delivery
- No client-side authentication

## Troubleshooting Email

The browser sends troubleshooting requests only to the same-origin API endpoint:

`/api/troubleshoot`

The support Gmail address and email provider API key stay on the server in Vercel Environment Variables.

Required server environment variables:

- `SUPPORT_EMAIL`
- `RESEND_API_KEY`
- `RESEND_FROM`

The browser never receives the support email address or email API key.

## Deployment

Deploy the repository with Vercel and configure the environment variables before testing the Troubleshoot form.