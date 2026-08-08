# Hangout API Server

NestJS backend for the Hangout social planning & meetup app.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Set up the database (SQLite for dev — zero config)
npx prisma migrate dev
npx tsx prisma/seed.ts

# 3. Start the server
npm run start:dev    # http://localhost:3000
```

Swagger docs at **http://localhost:3000/docs**

## Demo accounts (seeded)

| Email | Password | Username |
|---|---|---|
| maya@hangout.app | password123 | maya |
| leo@hangout.app | password123 | leo |
| sofia@hangout.app | password123 | sofia |
| demo@hangout.app | password123 | demo |

## Production (Postgres + Redis)

```bash
# Start Postgres + Redis
docker compose up -d

# Switch datasource
export DATABASE_URL="postgresql://hangout:hangout_dev@localhost:5432/hangout?schema=public"

# Migrate + seed
npx prisma migrate deploy
npx tsx prisma/seed.ts

# Build + run
npm run build
npm run start:prod
```

## API modules

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| **Users** | `GET /users/search?q=`, `GET /users/:id` |
| **Friends** | `GET /friends`, `GET /friends/requests`, `POST /friends/requests`, `POST /friends/requests/:id/accept`, `POST /friends/requests/:id/decline`, `DELETE /friends/:id` |
| **Places** | `GET /places?q=&category=&lat=&lng=`, `GET /places/:id` |
| **Hangouts** | `POST /hangouts`, `GET /hangouts?scope=upcoming\|past`, `GET /hangouts/:id`, `POST /hangouts/:id/join`, `POST /hangouts/:id/vote`, `GET /hangouts/:id/votes`, `DELETE /hangouts/:id` |
| **Chat** | `GET /hangouts/:id/messages`, `POST /hangouts/:id/messages` |
| **Live** | WebSocket `/live` — `start`, `stop`, `location` events |
| **Notifications** | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| **Memories** | `GET /hangouts/:id/memories`, `POST /hangouts/:id/memories`, `POST /memories/:id/like`, `DELETE /memories/:id` |
| **Discovery** | `GET /discovery?lat=&lng=` |

## WebSocket events

### Chat (`/chat` namespace)
- `join` → `{ hangoutId, userId }`
- `message` → `{ hangoutId, userId, body, kind }`
- Server emits: `message` (broadcast to room)

### Live location (`/live` namespace)
- `join` → `{ hangoutId }`
- `start` → `{ hangoutId, userId, mode: 'ETA_ONLY' \| 'LIVE' }`
- `location` → `{ hangoutId, userId, lat, lng }`
- `stop` → `{ hangoutId, userId }`
- Server emits: `location`, `arrived` (geofence 100m), `session_started`, `session_stopped`

## Tech stack

- **NestJS 11** + TypeScript
- **Prisma 6** ORM (SQLite dev / Postgres prod)
- **JWT** auth with Passport
- **Socket.IO** for real-time chat + live location
- **Swagger** OpenAPI docs at `/docs`
