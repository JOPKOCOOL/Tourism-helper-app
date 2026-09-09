# Tourism Helper App

Frontend for an app that helps with the registration of tourists. Built with Angular 22 (standalone components, signals) against a separate backend API.

## Status

Early-stage. Currently implemented: email/password login, JWT access/refresh authentication, and protected routing with an (intentionally empty) dashboard shell that later tourist-registration features will build on.

## Tech stack

- Angular 22 — standalone components, signals, new control-flow syntax
- TypeScript
- Tailwind CSS 4
- RxJS
- Vitest (unit tests)

## Authentication architecture

- **Access token**: returned by the backend on login, held in memory only (never persisted to storage), attached to outgoing requests via an `Authorization: Bearer` header by a functional HTTP interceptor (`src/app/core/interceptors/auth.interceptor.ts`).
- **Refresh token**: an httpOnly cookie set by the backend — never visible to JavaScript.
- On app startup, an app initializer calls `/auth/refresh` to silently restore the session after a page reload.
- On a `401` response, the interceptor transparently refreshes the access token and retries the original request once. Concurrent `401`s share a single in-flight refresh call instead of triggering duplicate refresh requests.
- **Route protection**: functional guards (`authGuard`, `guestGuard`) redirect based on auth state — logged-out users are sent from `/dashboard` to `/login`, and logged-in users are sent from `/login` straight to `/dashboard`.

## Project structure

```
src/app/
  core/         # app-wide singletons: guards, interceptors, services, models
  features/     # feature areas (auth, dashboard, ...)
  layout/       # shared page chrome (header, footer, sidebar) — not yet built
  shared/       # reusable components, directives, pipes, utils — not yet built
```

## Getting started

### Prerequisites

- Node.js and npm
- The backend API running locally (proxy defaults to `http://localhost:3000`)

### Install

```bash
npm install
```

### Configure the backend URL

Requests to `/auth/*` are proxied in dev to avoid CORS and keep cookie handling same-origin. If your backend runs somewhere other than `http://localhost:3000`, update the target in `proxy.conf.json`.

### Run the dev server

```bash
npm start
```

Then open `http://localhost:4200`.

### Build

```bash
npm run build
```

Compiles the app and writes build artifacts to `dist/`.

### Test

```bash
npm test
```

Runs unit tests with [Vitest](https://vitest.dev/).

## Roadmap

- Tourist registration features (dashboard content)
- WebSocket support (not yet implemented on the backend)
- `/auth/me` endpoint integration to replace the current refresh-based session check on startup
