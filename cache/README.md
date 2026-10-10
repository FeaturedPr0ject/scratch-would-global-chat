# CHC Cache Module

The module is `cache/chc.js`. It writes custom binary `.chc` files; it does not use JSON for cache payload serialization.

## Operations

- `writeCHC(type, name, value)`: serialize with Node's V8 binary serializer, encrypt using AES-256-GCM, then atomically save a `.chc` file.
- `readCHC(type, name)`: authenticate, decrypt, and deserialize a cache file. Returns `null` if the file does not exist.
- `deleteCHC(type, name)`: delete one cache file.
- `hasCHC(type, name)`: check whether one cache file exists.
- `clearCHC(type)`: delete all cache files within one supported category.
- `listCHC(type)`: list cache entry names within one category.
- `getCHCStats(type, name)`: return file existence, size in bytes, and modification time.
- `CHC_OPERATIONS`: machine-readable list of supported operations.
- `CHC_CACHE_TYPES`: supported cache categories.

## Supported folders

- `profilesdata/`
- `messages/`
- `configserver/`

Example imports:

```js
import {writeCHC, readCHC, listCHC} from "./cache/chc.js";

await writeCHC("profilesdata", "profile", {id: "example", displayName: "Example"});
const profile = await readCHC("profilesdata", "profile");
const names = await listCHC("profilesdata");
```

The example object is serialized to a binary V8 format, not JSON. It is only an API example; do not store session cookies, access tokens, refresh tokens, or other credentials in the cache.

## Required Render environment variable

Set `CHC_CACHE_KEY` to a randomly generated 32-byte key encoded as exactly 64 hexadecimal characters. Generate one locally with Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Add the output to Render's environment variables as `CHC_CACHE_KEY`. Keep it private and do not commit it to GitHub. Losing or rotating the key makes existing cache files unreadable; clear/rebuild the cache after rotation.

Optional: set `CHC_CACHE_DIR` to an absolute path on a persistent disk. Without this, the module uses the server's local `cache/` directory, which may be ephemeral on Render.

## Format and security notes

- Header magic: `CHC2`; version 1; key mode 0; 12-byte random nonce.
- Payload is serialized using Node's V8 serializer, then encrypted with AES-256-GCM.
- The header is authenticated as AES-GCM additional authenticated data.
- GCM authentication detects wrong keys and tampering.
- This is a Node-specific format; use the matching Node V8 version/runtime to deserialize it.
- This module is not yet wired into the API routes. Integrate it only where cache ownership, user/group authorization, expiration, and invalidation rules are defined.
- Binary format and encryption do not replace Supabase Row Level Security or server-side authorization.
- Cache contents should be treated as disposable and rebuilt from Supabase.
