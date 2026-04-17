# Implementation Plan: node-express-mongodb-api

## Overview

Implement a RESTful API using Node.js, Express, TypeScript, and MongoDB (Mongoose). The build follows a layered architecture (Router → Controller → Service → Repository → Model) with Zod validation middleware, JWT authentication, and a centralized error handler. Tasks are ordered so each step compiles and integrates cleanly before the next begins.

## Tasks

- [x] 1. Initialize project structure and tooling
  - Scaffold `package.json` with all required dependencies (`express`, `mongoose`, `zod`, `jsonwebtoken`, `bcrypt`, `dotenv`, `helmet`, `morgan`) and devDependencies (`typescript`, `ts-node`, `@types/*`, `vitest`, `fast-check`, `mongodb-memory-server`)
  - Add `"build": "tsc"`, `"start": "node dist/server.js"`, and `"dev": "ts-node src/server.ts"` scripts to `package.json`
  - Create `tsconfig.json` targeting ES2020, `moduleResolution: node`, `strict: true`, `outDir: dist`
  - Create `vitest.config.ts` with `globals: true` and `environment: "node"`
  - Create the full `src/` directory tree matching the design: `config/`, `models/`, `schemas/`, `repositories/`, `services/`, `controllers/`, `middleware/`, `routes/`, `utils/`
  - Create a `Procfile` at the project root with content `web: node dist/server.js`
  - Add `dist/` and `.env` to `.gitignore`
  - Create a `.env.example` file documenting `PORT` (note: set automatically by Heroku in production), `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`
  - _Requirements: 1.1, 1.4, 14.1–14.6, 24.1–24.4_

- [ ] 2. Implement environment configuration and database connection
  - [x] 2.1 Implement `src/config/env.ts`
    - Load `.env` via `dotenv`
    - Validate presence of `MONGODB_URI`, `PORT`, `JWT_SECRET`; log the missing variable name and call `process.exit(1)` if any are absent
    - Export typed `Config` interface and `config` object with `port`, `mongodbUri`, `jwtSecret`, `jwtExpiresIn` (default `"1h"`), `nodeEnv`
    - _Requirements: 1.3, 14.1–14.6_

  - [x] 2.2 Implement `src/config/db.ts`
    - Call `mongoose.connect(config.mongodbUri)`; log success or log error and `process.exit(1)` on failure
    - _Requirements: 2.1–2.4_

  - [x] 2.3 Write unit tests for `env.ts` and `db.ts`
    - Test that missing `MONGODB_URI`, `PORT`, or `JWT_SECRET` each trigger `process.exit(1)` with the correct variable name logged
    - Test that all variables present produces a valid `config` object
    - _Requirements: 14.6_

- [x] 3. Implement shared utilities and middleware foundations
  - [x] 3.1 Implement `src/utils/response.ts`
    - `sendData(res, statusCode, data)` → `{ data }`
    - `sendCollection(res, data[])` → `{ data, count }`
    - `sendError(res, statusCode, message)` → `{ status, message }`
    - _Requirements: 13.1–13.4_

  - [x] 3.2 Write property test for response helpers — Property 3 and Property 4
    - **Property 3: Single-resource response shape** — for any `data` value, `sendData` response body has a `data` field
    - **Property 4: Collection response shape and count consistency** — for any array, `sendCollection` response body has `data` array and `count === data.length`
    - **Validates: Requirements 13.2, 13.3**

  - [x] 3.3 Implement `src/utils/token.service.ts`
    - `signToken(payload)` using `config.jwtSecret` and `config.jwtExpiresIn`
    - `verifyToken(token)` returning decoded `JwtPayload`
    - _Requirements: 11.4, 11.5_

  - [x] 3.4 Write unit tests for `token.service.ts`
    - Test sign + verify round-trip with a known secret
    - Test that an expired token throws on verify
    - Test that a tampered token throws on verify
    - _Requirements: 11.4, 11.5_

  - [x] 3.5 Implement `src/middleware/error-handler.ts`
    - 4-argument Express error middleware
    - Log full stack trace via `console.error`
    - Return `AppError` instances with their `statusCode`; all others return `500`
    - All error responses use `{ status, message }` shape
    - _Requirements: 12.1, 12.2, 12.4_

  - [x] 3.6 Implement `src/middleware/validate-body.ts` and `src/middleware/validate-object-id.ts`
    - `validateBody(schema)` — parse `req.body` with Zod; on failure return `400` with field-level error details
    - `validateObjectId(param)` — check `req.params[param]` is 24-char hex; on failure return `400`
    - _Requirements: 10.1–10.4_

  - [x] 3.7 Write property test for validators — Property 6 and Property 7
    - **Property 6: Strict mode rejects unknown fields** — for any schema and any payload with an extra unknown field, `validateBody` returns `400`
    - **Property 7: Invalid ObjectId format returns 400** — for any string that is not a 24-char hex, `validateObjectId` returns `400`
    - **Validates: Requirements 10.4, 10.3**

  - [x] 3.8 Implement `src/middleware/jwt-authenticator.ts`
    - Extract `Bearer` token from `Authorization` header
    - Verify with `token.service.verifyToken`; attach decoded payload to `req.user`
    - Return `401` if header missing or token invalid/expired
    - _Requirements: 11.6–11.9_

  - [x] 3.9 Write unit tests for `jwt-authenticator.ts`
    - Test missing `Authorization` header → `401`
    - Test invalid token → `401`
    - Test valid token → `req.user` populated and `next()` called
    - _Requirements: 11.6–11.9_

- [x] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Mongoose models
  - [x] 5.1 Implement `src/models/user.model.ts`
    - Fields: `firstName`, `lastName`, `email` (unique), `password`; `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 3.1_

  - [x] 5.2 Implement `src/models/expense-category.model.ts`
    - Fields: `category` (max 100); `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 5.1_

  - [x] 5.3 Implement `src/models/payment-source.model.ts`
    - Fields: `source` (max 100); `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 7.1_

  - [x] 5.4 Implement `src/models/expense.model.ts`
    - Fields: `dayOfMonth`, `amount`, `type` (enum), `payee`, `payeeUrl`, `required`, `category` (ObjectId ref), `paymentSource` (ObjectId ref), `inactive` (default false), `inactiveDate`; `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 4.1_

  - [x] 5.5 Implement `src/models/income.model.ts`
    - Fields: `dayOfMonth`, `amount`, `source`, `isPaycheck`, `inactive` (default false), `inactiveDate`; `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 15.1_

  - [x] 5.6 Implement `src/models/period.model.ts`
    - Fields: `startDate`; `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 17.1_

  - [x] 5.7 Implement `src/models/period-expense.model.ts`
    - Fields: `period` (ObjectId ref), `expense` (ObjectId ref), `status` (enum), `overrideAmount`; `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 19.1_

  - [x] 5.8 Implement `src/models/period-income.model.ts`
    - Fields: `period` (ObjectId ref), `income` (ObjectId ref), `status` (enum), `overrideAmount`; `{ timestamps: true }`
    - _Requirements: 0.1, 0.2, 21.1_

- [x] 6. Implement Zod schemas
  - [x] 6.1 Implement `src/schemas/user.schema.ts`
    - `registerSchema` — `.strict()`, omit `_id`/`createdAt`/`updatedAt`, require `firstName`, `lastName`, `email` (valid email), `password` (min 8 chars)
    - `loginSchema` — `.strict()`, require `email` (valid email), `password` (non-empty)
    - Export inferred TypeScript types
    - _Requirements: 3.2–3.4, 11.10, 11.11_

  - [x] 6.2 Write property tests for user schema — Property 1, Property 11, Property 12
    - **Property 1: Base fields stripped** — payloads with `_id`/`createdAt`/`updatedAt` are stripped/rejected
    - **Property 11: Email validation rejects malformed addresses** — non-email strings rejected with `400`
    - **Property 12: Password minimum length enforced** — passwords < 8 chars rejected with `400`
    - **Validates: Requirements 0.3, 3.2, 3.3, 3.4**

  - [x] 6.3 Implement `src/schemas/expense-category.schema.ts`
    - `.strict()`, omit base fields, require `category` (non-empty, max 100); export type
    - _Requirements: 5.2–5.4_

  - [x] 6.4 Implement `src/schemas/payment-source.schema.ts`
    - `.strict()`, omit base fields, require `source` (non-empty, max 100); export type
    - _Requirements: 7.2–7.4_

  - [x] 6.5 Implement `src/schemas/expense.schema.ts`
    - `.strict()`, omit base fields; validate all Expense fields including `dayOfMonth` (int 1–31), `amount` (positive), `type` (enum), `payeeUrl` (optional URL), `category`/`paymentSource` (ObjectId regex), `inactive` (boolean), `inactiveDate` (optional ISO date, only when `inactive === true`)
    - Export type
    - _Requirements: 4.2–4.6_

  - [x] 6.6 Write property tests for expense schema — Property 1, Property 8, Property 9, Property 10, Property 19
    - **Property 1: Base fields stripped** — `_id`/`createdAt`/`updatedAt` stripped/rejected
    - **Property 8: dayOfMonth validated as integer in [1, 31]** — values outside range rejected
    - **Property 9: amount must be positive** — non-positive values rejected
    - **Property 10: inactiveDate only valid when inactive is true** — `inactiveDate` + `inactive=false` rejected
    - **Property 19: payeeUrl rejected when not a valid URL** — non-URL strings rejected
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

  - [x] 6.7 Implement `src/schemas/income.schema.ts`
    - `.strict()`, omit base fields; validate `dayOfMonth` (int 1–31), `amount` (positive), `source` (non-empty, max 100), `isPaycheck` (boolean), `inactive` (boolean), `inactiveDate` (optional ISO date, only when `inactive === true`)
    - Export type
    - _Requirements: 15.2–15.8_

  - [x] 6.8 Write property tests for income schema — Property 1, Property 8, Property 9, Property 10
    - **Property 1: Base fields stripped** — `_id`/`createdAt`/`updatedAt` stripped/rejected
    - **Property 8: dayOfMonth validated as integer in [1, 31]**
    - **Property 9: amount must be positive**
    - **Property 10: inactiveDate only valid when inactive is true**
    - **Validates: Requirements 15.2, 15.3, 15.4, 15.7**

  - [x] 6.9 Implement `src/schemas/period.schema.ts`
    - `.strict()`, omit base fields, require `startDate` (valid ISO 8601 `YYYY-MM-DD`); export type
    - _Requirements: 17.2–17.5_

  - [x] 6.10 Write property test for period schema — Property 20
    - **Property 20: startDate must be a valid ISO 8601 date** — invalid date strings rejected
    - **Validates: Requirements 17.3**

  - [x] 6.11 Implement `src/schemas/period-expense.schema.ts`
    - `.strict()`, omit base fields; validate `period`/`expense` (ObjectId regex), `status` (enum), `overrideAmount` (optional positive); export type
    - _Requirements: 19.2–19.4_

  - [x] 6.12 Write property tests for period-expense schema — Property 1, Property 9
    - **Property 1: Base fields stripped**
    - **Property 9: overrideAmount must be positive when present**
    - **Validates: Requirements 19.2, 19.3**

  - [x] 6.13 Implement `src/schemas/period-income.schema.ts`
    - `.strict()`, omit base fields; validate `period`/`income` (ObjectId regex), `status` (enum), `overrideAmount` (optional positive); export type
    - _Requirements: 21.2–21.4_

  - [x] 6.14 Write property tests for period-income schema — Property 1, Property 9
    - **Property 1: Base fields stripped**
    - **Property 9: overrideAmount must be positive when present**
    - **Validates: Requirements 21.2, 21.3**

- [x] 7. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement repositories
  - [x] 8.1 Implement `src/repositories/user.repository.ts`
    - `findByEmail`, `create`
    - _Requirements: 11.1, 11.2_

  - [x] 8.2 Implement `src/repositories/expense-category.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 6.1–6.6_

  - [x] 8.3 Implement `src/repositories/payment-source.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 8.1–8.6_

  - [x] 8.4 Implement `src/repositories/expense.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 9.1–9.6_

  - [x] 8.5 Implement `src/repositories/income.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 16.1–16.6_

  - [x] 8.6 Implement `src/repositories/period.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 18.1–18.6_

  - [x] 8.7 Implement `src/repositories/period-expense.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 20.1–20.6_

  - [x] 8.8 Implement `src/repositories/period-income.repository.ts`
    - `findAll`, `findById`, `create`, `update`, `remove`
    - _Requirements: 22.1–22.6_

- [x] 9. Implement services
  - [x] 9.1 Implement `src/services/auth.service.ts`
    - `register`: hash password with `bcrypt.hash(password, 10)`, call `userRepository.create`, sign JWT with `{ userId }`, return token
    - `login`: find user by email, `bcrypt.compare`, throw `AppError(401)` on mismatch, sign and return JWT
    - _Requirements: 11.1–11.3, 11.12_

  - [x] 9.2 Write unit tests for `auth.service.ts`
    - Test register creates user and returns a non-empty JWT string
    - Test login with correct credentials returns JWT
    - Test login with wrong password throws `AppError(401)`
    - Test login with unknown email throws `AppError(401)`
    - _Requirements: 11.1–11.3_

  - [x] 9.3 Implement `src/services/expense-category.service.ts`
    - Wrap repository calls; throw `AppError(404)` when `findById`/`update`/`remove` returns null
    - _Requirements: 6.1–6.6_

  - [x] 9.4 Implement `src/services/payment-source.service.ts`
    - Same pattern as expense-category service
    - _Requirements: 8.1–8.6_

  - [x] 9.5 Implement `src/services/expense.service.ts`
    - Same pattern; no user-scoping
    - _Requirements: 9.1–9.6_

  - [x] 9.6 Implement `src/services/income.service.ts`
    - Same pattern; no user-scoping
    - _Requirements: 16.1–16.6_

  - [x] 9.7 Implement `src/services/period.service.ts`
    - Same pattern; no user-scoping
    - _Requirements: 18.1–18.6_

  - [x] 9.8 Implement `src/services/period-expense.service.ts`
    - Same pattern; no user-scoping
    - _Requirements: 20.1–20.6_

  - [x] 9.9 Implement `src/services/period-income.service.ts`
    - Same pattern; no user-scoping
    - _Requirements: 22.1–22.6_

- [x] 10. Implement controllers
  - [x] 10.1 Implement `src/controllers/auth.controller.ts`
    - `register` handler: call `authService.register`, use `sendData(res, 201, { token })`
    - `login` handler: call `authService.login`, use `sendData(res, 200, { token })`
    - _Requirements: 11.1, 11.2, 13.2_

  - [x] 10.2 Implement `src/controllers/expense-category.controller.ts`
    - `getAll` → `sendCollection`; `getById` → `sendData(200)`; `create` → `sendData(201)`; `update` → `sendData(200)`; `remove` → `204`
    - _Requirements: 6.1–6.6, 13.2, 13.3_

  - [x] 10.3 Implement `src/controllers/payment-source.controller.ts`
    - Same CRUD pattern as expense-category controller
    - _Requirements: 8.1–8.6, 13.2, 13.3_

  - [x] 10.4 Implement `src/controllers/expense.controller.ts`
    - Same CRUD pattern; no user-scoping
    - _Requirements: 9.1–9.6, 13.2, 13.3_

  - [x] 10.5 Implement `src/controllers/income.controller.ts`
    - Same CRUD pattern; no user-scoping
    - _Requirements: 16.1–16.6, 13.2, 13.3_

  - [x] 10.6 Implement `src/controllers/period.controller.ts`
    - Same CRUD pattern; no user-scoping
    - _Requirements: 18.1–18.6, 13.2, 13.3_

  - [x] 10.7 Implement `src/controllers/period-expense.controller.ts`
    - Same CRUD pattern; no user-scoping
    - _Requirements: 20.1–20.6, 13.2, 13.3_

  - [x] 10.8 Implement `src/controllers/period-income.controller.ts`
    - Same CRUD pattern; no user-scoping
    - _Requirements: 22.1–22.6, 13.2, 13.3_

- [x] 11. Implement routes and wire the Express app
  - [x] 11.1 Implement all route files under `src/routes/`
    - `auth.routes.ts` — `POST /register`, `POST /login` (no auth middleware)
    - `expense-category.routes.ts` — full CRUD with `jwtAuthenticator`, `validateObjectId`, `validateBody`
    - `payment-source.routes.ts` — same pattern
    - `expense.routes.ts` — same pattern
    - `income.routes.ts` — same pattern
    - `period.routes.ts` — same pattern
    - `period-expense.routes.ts` — same pattern
    - `period-income.routes.ts` — same pattern
    - _Requirements: 6.1–6.7, 8.1–8.7, 9.1–9.7, 11.1, 11.2, 16.1–16.7, 18.1–18.7, 20.1–20.7, 22.1–22.7_

  - [x] 11.2 Implement `src/app.ts`
    - Apply `helmet()` and `morgan()` globally (dev vs combined format based on `NODE_ENV`)
    - Apply `express.json()`
    - Mount all routers under `/api`
    - Register 404 catch-all route after all resource routes
    - Register `errorHandler` as the last middleware
    - _Requirements: 1.5, 12.3, 23.1, 23.2_

  - [x] 11.3 Implement `src/server.ts`
    - Import `config` and `connectDB`; call `connectDB()` then `app.listen(config.port)`; log the port on success
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 12. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [-] 13. Write integration tests
  - [x] 13.1 Write integration tests for auth endpoints
    - Use `mongodb-memory-server` for in-memory MongoDB
    - Test `POST /api/auth/register` with valid payload → `201` + JWT in response
    - Test `POST /api/auth/login` with correct credentials → `200` + JWT
    - Test `POST /api/auth/login` with wrong password → `401`
    - _Requirements: 11.1–11.3_

  - [x] 13.2 Write property tests for auth — Property 13, Property 14, Property 15, Property 16, Property 17
    - **Property 13: Plaintext password never returned in responses** — for any valid registration, response body does not contain the submitted password
    - **Property 14: Auth register round-trip returns a JWT** — valid registration payloads always yield `201` + non-empty token
    - **Property 15: Auth login returns JWT for valid credentials** — registered user + correct password always yields `200` + token
    - **Property 16: Invalid credentials always return 401** — wrong email or wrong password always yields `401`
    - **Property 17: Invalid or expired JWT returns 401 on protected routes** — malformed/expired tokens always yield `401`
    - **Validates: Requirements 11.1–11.3, 11.9, 3.5**

  - [x] 13.3 Write integration property tests for CRUD resources — Property 2, Property 3, Property 4, Property 5
    - **Property 2: Created documents always include base fields** — for any valid create payload, response contains non-null `_id`, `createdAt`, `updatedAt`
    - **Property 3: Single-resource response shape** — GET by id, POST, PUT responses always have a `data` field
    - **Property 4: Collection response shape and count consistency** — GET all responses always have `data` array and `count === data.length`
    - **Property 5: Create round-trip preserves submitted fields** — POST response contains all submitted fields with original values
    - **Validates: Requirements 0.2, 0.4, 13.2, 13.3, 6.1, 8.1, 9.1, 16.1, 18.1, 20.1, 22.1**

  - [x] 13.4 Write integration tests for error response shape — Property 18
    - **Property 18: Error responses always contain status and message fields** — trigger 400, 401, 404, 500 conditions and verify `{ status, message }` shape
    - **Validates: Requirements 12.4, 13.4**

- [x] 14. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 15. Heroku deployment preparation
  - [x] 15.1 Verify `Procfile` exists at the project root with content `web: node dist/server.js`
    - _Requirements: 24.1_
  - [x] 15.2 Verify `package.json` has `"build": "tsc"` and `"start": "node dist/server.js"` scripts
    - _Requirements: 24.2, 24.3_
  - [x] 15.3 Verify `dist/` and `.env` are listed in `.gitignore`
    - _Requirements: 24.4_
  - [x] 15.4 Verify `.env.example` documents all required Config Vars (`MONGODB_URI`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`) with a note that `PORT` is set automatically by Heroku in production
    - _Requirements: 24.4, 24.5_
  - [x] 15.5 Verify `src/server.ts` binds to `process.env.PORT` with no hardcoded port fallback
    - Confirm `config.port` is read exclusively from `process.env.PORT` in `src/config/env.ts`
    - _Requirements: 1.3, 24.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fc.assert(fc.property(...), { numRuns: 100 })` with fast-check
- Integration tests use `mongodb-memory-server` — no live MongoDB required
- All Mongoose schemas use `{ timestamps: true }`; never manually set `_id`, `createdAt`, or `updatedAt`
- All Zod schemas use `.strict()` mode and omit base fields
- The `AppError` class is the single mechanism for service-layer error propagation
