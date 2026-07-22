# CloudOps Platform — Setup Guide (Phase 1 Foundation)

A self-hosted DevOps platform for connecting Kubernetes clusters, managing workloads, and monitoring deployments from a web dashboard. This guide documents every step taken to get the project's foundation running: monorepo setup, frontend scaffold, backend scaffold, database, cache, and authentication.

**Stack**
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, Redis, JWT, Socket.IO
- Frontend: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query
- Tooling: pnpm workspaces, Turborepo, Docker Compose


**Steps:**
1. Create the folder structure:
   ```
   cloudops-platform/
   ├── apps/
   │   ├── backend/
   │   └── frontend/
   ├── packages/
   ├── package.json
   ├── pnpm-workspace.yaml
   └── turbo.json
   ```
2. setting up a Root `package.json`, that controls the both apps(frontend and backend):
 
3. A `turbo.json`: that run both backend and frontend



## Stage 2 — Frontend Scaffold (Vite)

**Steps:**
```bash
cd apps/frontend
npm create vite@latest . -- --template react-ts
pnpm install 
```

**Add Tailwind CSS v4** (CSS-first setup — no `tailwind.config.js` needed):
```bash
pnpm add -D @tailwindcss/vite
```
`src/index.css`:
```css

**Add path alias to `tsconfig.app.json`:**
```jsonc

**Install shadcn/ui:**
```
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button
```




## Stage 3 — Backend Scaffold (NestJS)

**Steps:**
```bash
cd apps/backend
npx @nestjs/cli new . --package-manager pnpm
# say NO to git init (monorepo root already has one)
```

**Add a `dev` script alias** in `apps/backend/package.json` (Turbo's `dev` task expects a `dev` script per package):
```json
"scripts": {
  "dev": "nest start --watch",
  "start:dev": "nest start --watch"
}
```

**Re-add the shared package dependency:**
```json
"dependencies": {
  "@cloudops/shared": "workspace:*"
}
```

**Sample response (success):**
```
[Nest] 45798  LOG [NestFactory] Starting Nest application...
[Nest] 45798  LOG [InstanceLoader] AppModule dependencies initialized +15ms
[Nest] 45798  LOG [RoutesResolver] AppController {/}: +3ms
[Nest] 45798  LOG [RouterExplorer] Mapped {/, GET} route +3ms
[Nest] 45798  LOG [NestApplication] Nest application successfully started +2ms
```

---

## Stage 4 — Environment Configuration

**Why:** fail fast on boot if required env vars are missing, instead of discovering it later at runtime.

**Install:**
```bash
cd apps/backend
pnpm add @nestjs/config joi
```

**`apps/backend/.env`:**
```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://cloudops:cloudops_dev_password@localhost:5432/cloudops?schema=public

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=change-this-to-something-long-and-random-at-least-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-this-too-different-from-above-also-32-chars
JWT_REFRESH_EXPIRES_IN=7d
```

**`src/config/env.validation.ts`:**
```ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});
```

**Register globally in `app.module.ts`:**
```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
  envFilePath: '.env',
}),
```

**Sample response (failure — this is the correct/expected behavior when a var is missing):**
```
ERROR [ExceptionHandler] Error: Config validation error:
"DATABASE_URL" is required. "REDIS_HOST" is required. "JWT_SECRET" is required.
```
This confirms validation is working — the app refuses to boot with incomplete config.

---

## Stage 5 — Docker (PostgreSQL + Redis)

**`docker-compose.yml`** at the **monorepo root** (not inside `apps/backend`):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: cloudops-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: cloudops
      POSTGRES_PASSWORD: cloudops_dev_password
      POSTGRES_DB: cloudops
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: cloudops-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```



**Daily workflow for development:**
```bash
cd ~/cloudops-platform      # must run from root — this is where the file lives
docker compose up -d        # start both containers (fast after first pull)
docker compose ps           # confirm both show "Up"
docker compose down         # stop when done (data persists in named volumes)
```

> Images are pulled once and cached locally. You do **not** need to re-pull on every session — only `docker compose up -d` / `down`.

**Sample response (success):**
```
$ docker compose ps
NAME               IMAGE                 STATUS
cloudops-postgres  postgres:16-alpine    Up 2 minutes
cloudops-redis     redis:7-alpine        Up 2 minutes
```

---

## Stage 6 — Prisma + PostgreSQL

**Install:**
```bash
cd apps/backend
pnpm add -D prisma
pnpm add @prisma/client @prisma/adapter-pg pg
pnpm add -D @types/pg
npx prisma init
```

**`prisma/schema.prisma`** (Prisma 7+ — no `url` in the datasource block; connection info lives in `prisma.config.ts` for the CLI and is passed as an `adapter` at runtime):


**`prisma.config.ts`** (used by the CLI for migrations):
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

**`src/prisma/prisma.service.ts`** (used by the running app — requires an explicit adapter in Prisma 7+):
```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';



---

## Stage 7 — Redis Client

**Install:**
```bash
pnpm add ioredis
```



`src/redis/redis.module.ts` — same `@Global()` pattern as Prisma, exporting `RedisService`.

**Sample failure to watch for:**
```
ERROR [ExceptionsHandler] MaxRetriesPerRequestError: Reached the max retries per request limit (which is 20).
```
This means the Redis container isn't running — fix with `docker compose up -d` from the root.

---

## Stage 8 — JWT Authentication

**Install:**
```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
pnpm add -D @types/passport-jwt @types/bcrypt
```

**`src/auth/strategies/jwt.strategy.ts`:**


**`src/common/guards/jwt-auth.guard.ts`:**
```ts


**Core logic — `src/auth/auth.service.ts`:** register, login, refresh, logout. Access + refresh tokens are signed with separate secrets; the refresh token is stored in Redis (`refresh:<userId>`) so `logout()` can actually revoke it.

**Enable validation globally — `main.ts`:**
```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.enableCors({ origin: 'http://localhost:5173', credentials: true });
```

**Sample response (success) — register:**
```bash


---

## Stage 9 — Socket.IO (JWT-authenticated WebSocket gateway)

**Install:**
```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**`src/websocket/events.gateway.ts`:** verifies the JWT on the handshake (`client.handshake.auth.token`) and disconnects any client that fails verification — this is the foundation for real-time log/event streaming in later phases.

---

## Stage 10 — Users Module

`UsersService` (Prisma-backed CRUD, passwords hashed with bcrypt, `password` excluded from any returned object) + `UsersController` with a protected `/users/me` route guarded by `JwtAuthGuard`.

---

## Stage 11 — Frontend ↔ Backend Integration

**`apps/frontend/.env`:**
```env
VITE_API_URL=http://localhost:3000
```

**`src/lib/api-client.ts`:**
```ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**`src/main.tsx`** — wrap the app in `QueryClientProvider`.

**`src/features/auth/useLogin.ts`** / **`useRegister.ts`** — TanStack Query mutations calling `/auth/login` and `/auth/register`.

**Sample response (success) — full stack running:**
```bash
$ docker compose ps
cloudops-postgres   Up
cloudops-redis      Up

$ pnpm dev   # from root, runs both apps via Turbo
backend:dev:  Nest application successfully started
frontend:dev: VITE ready — Local: http://localhost:5173/
```
Submitting the login form in the browser stores `accessToken`/`refreshToken` in `localStorage` and shows "Login successful!"

---

## Current status

✅ Monorepo (pnpm + Turborepo)
✅ Frontend foundation (Vite, Tailwind v4, shadcn/ui, TanStack Query)
✅ Backend foundation (NestJS, env validation)
✅ PostgreSQL + Redis via Docker Compose
✅ Prisma schema + migrations (User, Cluster, AuditLog)
✅ JWT authentication (register, login, refresh, logout)
✅ Socket.IO gateway with JWT-authenticated handshake
✅ Users module
✅ Frontend-backend integration confirmed end-to-end

**Not yet started (Phase 1 remainder / Phase 2+):**
- Kubernetes client (`@kubernetes/client-node`) + Cluster module (store + encrypt kubeconfig, test connection)
- Cluster dashboard endpoint
- Namespaces / Pods / Deployments / Services / Logs / Events views
- Mutating actions (scale, restart, delete, rollout restart)
- Deployment history, rollbacks, registry image management
- Prometheus/Grafana integration
- GitHub integration