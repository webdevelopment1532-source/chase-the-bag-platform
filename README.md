<<<<<<< HEAD
# Contributor Oath & Good Faith Statement

By contributing to this project, you agree to:
- Act in good faith and with respect for the company, its operations, and all users.
- Uphold the values and guidelines of Discord and GitHub at all times.
- Never use this project for malicious, abusive, or illegal purposes.
- Ensure all integrations and features comply with Discord’s Terms of Service, Community Guidelines, and GitHub’s Community Guidelines.
- Foster a positive, inclusive, and secure environment for all users and contributors.

---

# Developer Notes & Contribution Guidelines
## Integrations

This project is designed for advanced integrations with Discord and other platforms. All integrations must:
- Respect Discord’s API rate limits and guidelines
- Not collect or misuse user data
- Be documented in the code and in this README
- Be reviewed for security and compliance before merging

For help with advanced integrations, see the `src/` directory or open an issue on GitHub.

## Project Baseline
This repository is a Discord bot with original, in-house game logic (not copied from Stake or any third-party platform), featuring:
- Coin Flip, Dice, Roulette, Crash, Blackjack, Slots, Plinko, Mines (all virtual, no real-money gambling)
- All commands restricted to the #coin-exchange-payed-games channel
- 100% test coverage and security checks
- Fully compliant with Discord Terms of Service and Community Guidelines

## How to Contribute
- Fork the repository and create a feature branch
- Run `npm install` to set up dependencies
- Use `npm run dev` for development and `npm run build` for production
- Add or update tests in the `test/` directory; ensure all tests pass with `npx jest --coverage`
- Do not commit secrets or tokens; use `.env` for local secrets
- All new features must:
	- Be safe, fair, and for entertainment only
	- Not promote or enable real-money gambling
	- Respect user privacy and Discord's rules
- Submit a pull request with a clear description of your changes

## Security
- No sensitive data or tokens should be committed
- Security tests are included in `test/security.test.ts`
- Please report vulnerabilities via GitHub Issues

## Maintainers
See CONTRIBUTORS.md for a list of maintainers and contact info.
# Discord Game Server Bot

This bot brings original casino-style mini games to your Discord server, including:
- Coin Flip (!coinflip)
- Dice Roll (!dice)
- Roulette (!roulette)
- Crash (!crash)
- Blackjack (!blackjack)
- Slots (!slots)
- Plinko (!plinko)
- Mines (!mines)

All games are restricted to the #coin-exchange-payed-games channel.

## Getting Started
- Clone the repo
- Set your `DISCORD_TOKEN` in `.env`
- Set `OWNER_DISCORD_USER_ID` in `.env` to enable owner/admin command controls
- Set `DISCORD_GAME_DB_HOST`, `DISCORD_GAME_DB_PORT`, `DISCORD_GAME_DB_USER`, `DISCORD_GAME_DB_PASS`, and `DISCORD_GAME_DB_NAME` in `.env` if you want analytics, referrals, code storage, and audit logging enabled
- Set `GAME_CHANNEL_ID` and `COIN_EXCHANGE_CHANNEL_ID` so commands are limited to approved channels
- Set `API_AUTH_TOKEN` and `API_ADMIN_ID` before enabling API consumers
- Set `FRONTEND_PORT` (default `5173`) for stack health checks
- Run `npm install`
- Run `npm run db:init` to create the required MySQL tables
- Run `npm run dev` or `npm run start`

## VS Code Operations Cockpit
- Run task: `Start Full Platform (Bot + Frontend)` to bring up the Discord bot/API and frontend together.
- Run task: `Monitor: Stack Health` to validate frontend, API overview, and exchange overview endpoints.
- Run task: `Stryker: Run in Sandbox (Node.js Isolated)` for mutation testing and robustness checks.
- Run task: `Jest: Test Sandbox Isolation` for deterministic full-suite checks.

CLI equivalents:
- `npm run platform:up`
- `npm run monitor:stack`
- `npm run test:isolate`
- `npm run stryker:sandbox`

## Coin Exchange Commands
- `!exchange help`
- `!exchange wallet`
- `!exchange send @user amount`
- `!exchange offer @user amount optional note`
- `!exchange offers`
- `!exchange accept offerId`
- `!exchange cancel offerId`
- `!exchange history`
- `!exchange grant @user amount` (admin only)

## Robustness and Compliance Checklist
- Keep all bot/game commands channel-restricted using `GAME_CHANNEL_ID` and `COIN_EXCHANGE_CHANNEL_ID`
- Use cooldown controls (`COMMAND_COOLDOWN_MS`, `EXCHANGE_COMMAND_COOLDOWN_MS`) to reduce spam and rate-limit pressure
- Never commit secrets (`DISCORD_TOKEN`, DB password, API token)
- Keep audit logging enabled for sensitive actions (grants, transfers, offer lifecycle)
- Keep features entertainment-only and do not support real-money gambling flows
- Respect Discord API rate limits and Terms of Service
- Respect GitHub Terms and avoid automations that violate repository or account policies

## Commands
- `!coinflip` — Flip a coin
- `!dice` — Roll a dice
- `!roulette` — Spin the roulette
- `!crash` — Simulate crash multiplier
- `!blackjack` — (Coming soon)
- `!slots` — Spin the slots
- `!plinko` — (Coming soon)
- `!mines` — (Coming soon)

## Testing
Automated tests will be added for all commands.
=======

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
>>>>>>> d57f07f (Fix build, align Jest config, update dependencies, and ensure Vercel compatibility)
