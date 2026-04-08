
# Chase the Bag Crypto Coin Exchange Platform

## Overview
A production-grade, full-stack, modular, and mutation-tested Discord P2P crypto exchange platform.

- **TypeScript monorepo**: Modular, maintainable, and scalable codebase
- **Fastify backend**: Secure, high-performance API server
- **Discord bot integration**: Real-time P2P trading via Discord
- **MySQL**: Secure, unified DB access with strict validation
- **Escrow and wallet logic**: Safe, auditable transactions
- **Advanced security**: Input validation, anomaly detection, audit logging, SIEM, incident response
- **100% test and mutation coverage**: All logic covered by unit, integration, property-based, and mutation tests
- **CI/CD**: Automated testing, coverage, and mutation analysis
- **Observability**: OpenTelemetry tracing, structured logging

---

## Key Principles
- **Modularization**: All logic split into focused modules (DB, business, API, validation, etc.)
- **Security**: Input validation, parameterized queries, audit logging, anomaly detection, SIEM, incident response
- **Testing**: Every feature covered by unit, integration, property-based, E2E, and mutation tests
- **Automation**: CI/CD, SAST/DAST, dependency scanning, secrets management
- **Documentation**: Progress and architecture documented in Markdown

---

## Getting Started
1. **Clone the repo**
2. **Install dependencies**: `npm install`
3. **Set up your `.env` file** (see below)
4. **Run all tests**: `npm test` (unit, integration, property-based, mutation)
5. **Run mutation tests**: `npx stryker run`
6. **Start the backend**: `npm run start`
7. **Start the Discord bot**: `npm run bot`

### .env Example
```
PORT=4000
DISCORD_TOKEN=your_discord_bot_token
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chase_exchange
```

---

## Project Structure
- `src/` — All source code
  - `db.ts` — Secure, unified DB access
  - `coin-exchange.ts` — Business logic (modularized)
  - `backend/` — API server, routes, security, SIEM, alerting, incident response
  - `bot/` — Discord bot logic
  - `audit-log.ts` — Audit logging
  - `types/` — Shared types/interfaces
- `test/` — All tests (unit, integration, property-based, mutation, E2E)
- `stryker.conf.js` — Mutation testing config
- `jest.config.js` — Jest config
- `.env` — Environment variables
- `PROGRESS.md` — Build log and architectural decisions

---

## Security & Testing Practices
- **Input validation**: Joi everywhere
- **Parameterized queries**: Prevent SQL injection
- **Audit logging**: All critical actions
- **Anomaly detection**: Real-time, with alerting
- **SIEM & incident response**: Automated detection and response
- **OpenTelemetry tracing**: Distributed tracing for all requests
- **Structured logging**: Pino logger
- **100% test coverage**: Statements, branches, functions, lines
- **Mutation testing**: All mutants killed (Stryker)
- **Property-based & fuzz testing**: fast-check
- **E2E testing**: Cypress/Playwright
- **Performance/load testing**: k6
- **SAST/DAST**: Static/dynamic analysis in CI
- **Dependency scanning**: Automated in CI
- **Secrets management**: No secrets in codebase
- **Pentesting**: Regularly scheduled

---

## Scripts
- `npm test` — Run all tests (unit, integration, property-based)
- `npx stryker run` — Run mutation tests
- `npm run start` — Start backend server
- `npm run bot` — Start Discord bot
- `npm run dev` — Run backend and bot concurrently

---

## Progress & Decisions
See `PROGRESS.md` for a detailed build log and architectural decisions.

---

## License
MIT
