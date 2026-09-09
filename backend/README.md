# Tourism Helper

A REST API built with [NestJS](https://nestjs.com), [Prisma](https://www.prisma.io), and PostgreSQL, built to make registering tourists easier. It implements authentication with short-lived access tokens and rotating, revocable refresh tokens.

## Features

- Email/password registration and login, passwords hashed with `bcrypt`.
- Short-lived JWT access tokens (`Authorization: Bearer <token>`), verified via a Passport strategy.
- Long-lived refresh tokens issued as an httpOnly, Secure, SameSite cookie — never exposed to client-side JavaScript.
- Refresh token **rotation**: every `/auth/refresh` call issues a new refresh token and invalidates the old one.
- Reuse detection: presenting an already-rotated refresh token revokes every other active session for that user, treating it as a sign of token theft.
- Routes are protected by default via a global guard; individual routes opt out with a `@Public()` decorator.

## Tech stack

- [NestJS](https://nestjs.com) / TypeScript
- [Prisma ORM](https://www.prisma.io) + PostgreSQL
- Passport / `passport-jwt` for access token verification
- `bcrypt` for password hashing (refresh tokens are hashed with SHA-256 for fast deterministic lookup)

## Getting started

### Prerequisites

- Node.js
- A running PostgreSQL instance

### Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for access tokens |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `900s`) |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens — must differ from `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CORS_ORIGIN` | Origin allowed to make credentialed requests (your frontend's URL) |
| `PORT` | Port the server listens on |

Apply the database schema:

```bash
npx prisma migrate dev
```

Run the app:

```bash
npm run start:dev
```

## API

| Method | Route | Auth required | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Create a new user |
| POST | `/auth/login` | No | Validate credentials, return an access token, set the refresh token cookie |
| POST | `/auth/refresh` | No (refresh cookie) | Rotate the refresh token, return a new access token |
| POST | `/auth/logout` | No (refresh cookie) | Revoke the refresh token and clear the cookie |
| * | `/users/*` | Yes | User management |

## Testing

```bash
npm run test       # unit tests
npm run test:e2e   # end-to-end tests
npm run test:cov   # coverage
```
