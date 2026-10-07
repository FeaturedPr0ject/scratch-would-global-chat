# SWGC Mini Chat Server

A small Node.js realtime backend for SWGC Room Chats.

## Features

- Persistent JSON storage
- Case-insensitive unique usernames
- Separate display names
- Profile notes
- Avatar URLs
- Message history
- REST API
- WebSocket realtime events
- No email secrets
- No client authentication provider required

## Run

Install dependencies and start the server.

The server listens on the PORT environment variable or port 3000.

## Endpoints

- GET /health
- POST /api/session
- GET /api/username?username=...
- GET /api/profiles
- POST /api/profiles
- GET /api/messages
- POST /api/messages
- WebSocket /ws

The data file is stored in data/chat.json. For production hosting, use a persistent disk or replace the JSON store with a database.