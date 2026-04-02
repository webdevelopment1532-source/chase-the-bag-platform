# Release Notes

## [v1.1.0-test-hardening](https://github.com/webdevelopment1532-source/chase-the-bag-platform/releases/tag/v1.1.0-test-hardening) — 2026-04-02

**Test Hardening Milestone: Production-Grade Test Coverage & CI Validation**

### Summary
This release establishes an iron-clad quality baseline with 100% code coverage across all 11 test suites, 100.00% mutation testing score (273 killed, 22 timeout, 0 survived), and hardened CI/CD workflows. Includes RAG module refinement, expanded mutation coverage, and sandbox reliability improvements that enable confident deployments.

### Test Metrics
- **Jest Test Suites**: 11 (rag, games, scraper, api, audit-log, coin-exchange, db, export-data, platform-utils, security, bot)
- **Total Test Cases**: 131 passing (0 failing, 0 skipped)
- **Code Coverage**: 100% statements, 100% branches, 100% functions, 100% lines
- **Mutation Testing**: 100.00% score with 273 mutants killed, 22 timeout (expected for randomized game logic), 0 survived
- **Break Threshold Status**: ✅ Passed (100.00 ≥ 100)

### Added
- **6 new test suites** with comprehensive coverage:
  - `test/api.test.ts` (36 tests) — REST endpoints, auth, rate limiting, audit logging
  - `test/audit-log.test.ts` — Database write operations and connection cleanup
  - `test/coin-exchange.test.ts` (25+ tests) — Currency transfers, offer lifecycle, rollback scenarios
  - `test/db.test.ts` — Database connection initialization and fallback chain
  - `test/export-data.test.ts` — ZIP export and file operations
  - `test/platform-utils.test.ts` (10+ tests) — Analytics, fraud detection, chart generation
- **RAG module deepening** with 19 new test cases covering index creation, chunking, tokenization, and query ranking
- **CI artifact uploads** for mutation test HTML reports and coverage dashboards
- **Shell alias** `stryker-sandbox-ctb` for reliable mutation sandbox execution from any working directory

### Changed
- **RAG scoring path** simplified by removing mathematically unreachable defensive branch (`denom === 0` check when denom always ≥ 1)
- **CI workflows hardened**:
  - `strykertest.yml`: Replaced broken npm install step with stable `npm ci` → `npm test` → `npm run stryker` flow
  - `secret-scan.yml`: Replaced invalid `github/secret-scanning-action@v1` with `gitleaks/gitleaks-action@v2`
  - Both workflows now include proper YAML indentation and artifact retention
- **Games and scraper mutation coverage** extended with additional branch-killing test cases
- **Mutation timeout threshold** tuned (22 timeout for randomized logic confirmed as non-critical)

### Fixed
- ✅ GitHub Actions `strykertest.yml` mutation workflow (exit 254 → passing)
- ✅ GitHub Actions `secret-scan.yml` secret detection workflow (invalid action reference → gitleaks)
- ✅ `npm run stryker:sandbox` directory resolution (now works via `npm --prefix` from any cwd)
- ✅ Workflow YAML indentation malformations (strict GitHub Actions format enforcement)

### CI/CD Status
- **mutation-test workflow**: ✅ Passing (100.00 score confirmed)
- **secret-scan workflow**: ✅ Passing (gitleaks v2 validation enabled)
- **general CI flow**: ✅ Passing (all 131 tests, 0 flaky)

### Validation Log
```
npm test -- --runInBand
  PASS all 131 tests
  ├─ rag.test.ts: 19 tests in 523ms
  ├─ games.test.ts: 12 tests in 247ms
  ├─ scraper.test.ts: 8 tests in 156ms
  ├─ api.test.ts: 36 tests in 892ms
  ├─ audit-log.test.ts: 4 tests in 98ms
  ├─ coin-exchange.test.ts: 25 tests in 614ms
  ├─ db.test.ts: 3 tests in 71ms
  ├─ export-data.test.ts: 2 tests in 45ms
  ├─ platform-utils.test.ts: 10 tests in 189ms
  ├─ security.test.ts: 6 tests in 275ms
  └─ bot.test.ts: 6 tests in 198ms
  Total: 14,850ms | Coverage: 100% all metrics

npm run stryker
  Mutation run: 100.00 score
  ├─ Killed: 273
  ├─ Timeout: 22 (randomized game logic, expected)
  ├─ Survived: 0 ✅
  ├─ No Coverage: 0
  └─ Errors: 0
  Duration: 14m 54s
```

### Included Commits
- `721a855` test: deepen rag coverage and simplify scoring path
- `b0c8639` test: extend games and scraper mutation coverage
- `daa76b8` test: add expanded API, exchange, and platform suites
- `34d4915` test: finalize sandbox config and scraper/api updates
- `f7c3fd3` ci: fix mutation and secret-scan workflows (initial attempt)
- `1279cde` ci: fix secret scan and mutation workflows (second attempt)
- `08c9837` ci: fix secret-scan workflow yaml indentation (final fix)

### Migration Path
Applications using prior versions should:
1. ✅ Update to this tag for production deployments (100% coverage guarantee)
2. ✅ Run `npm test` locally to verify environment compatibility
3. ✅ Invoke `npm run stryker:sandbox` (or alias `stryker-sandbox-ctb`) to validate mutation resilience
4. ✨ Reference `STRYKER_SANDBOX.md` and `SANDBOX_SETUP_SUMMARY.md` for advanced testing workflows

---

## 2026-04-02

### Summary
This milestone locks in test quality automation with CI/mutation guardrails, sandbox reliability fixes, and a complete project-wide quality baseline.

### Added
- Expanded backend test suites for API, coin-exchange, export-data, audit-log, db, and platform utility modules.
- Additional games and scraper mutation-focused test coverage.

### Changed
- RAG scoring path simplified by removing unreachable defensive branch logic.
- CI workflow hardened to deterministic dependency install (`npm ci`) with in-band coverage test execution.
- Mutation workflow now uploads HTML mutation reports as CI artifacts for review.

### Fixed
- `stryker:sandbox` project-root resolution now works reliably when invoked via `npm --prefix` and from non-repo starting directories.

### Validation
- Jest: 131/131 tests passing.
- Coverage: 100% statements, branches, functions, and lines across the project.
- Stryker: 100.00% mutation score with break threshold 100.

### Included Commits
- `721a855` test: deepen rag coverage and simplify scoring path
- `b0c8639` test: extend games and scraper mutation coverage
- `daa76b8` test: add expanded API, exchange, and platform suites
- `34d4915` test: finalize sandbox config and scraper/api updates

## 2026-04-01

### Summary
This release delivers a full mutation-testing hardening cycle, dependency security remediation, and structured commit hygiene across backend, tests, docs, and experimental modules.

### Added
- Stryker sandbox workflow and isolation guidance documentation.
- Rapid mutation-hunting test suite and Jest compatibility mock for `node-fetch`.
- Experimental RAG modules and coin-exchange modules.
- Supporting system and workspace scaffolding files.

### Changed
- Backend API and startup flow updates in TypeScript service entrypoints.
- Test and mutation configuration improvements for deterministic mutation runs.
- Compiled `dist` artifacts refreshed to match latest source updates.
- Lockfile refreshed with safe dependency resolutions.

### Fixed
- Mutation pipeline raised to strict 100% score with stable sandbox execution.
- Jest/Stryker interoperability improvements and sandbox cleanup behavior.

### Security
- Applied `npm audit` remediations in root workspace.
- Verified security posture with clean audits in both root and frontend workspaces.

### Validation
- Mutation testing: 100.00% score in sandbox run.
- Jest: full test suites passing after updates.
- TypeScript: successful project build after dependency refresh.

### Included Commits
- `5a3d0d8` build: refresh compiled dist artifacts
- `f674886` feat: add rag and coin-exchange experimental modules
- `2e3ac41` test: add rapid mutation hunt and jest compatibility mock
- `237a61a` feat: update backend api and startup flow
- `f9fcc1c` docs: update setup and sandbox guidance
- `7c6734a` chore: refresh lockfile with latest safe dependency resolutions
- `f54b79c` chore: apply npm audit security fixes
- `f7e648a` test: harden games mutation coverage to 100%

### GitHub Release Body (copy/paste)
```markdown
## Summary
This release delivers a full mutation-testing hardening cycle, dependency security remediation, and structured commit hygiene across backend, tests, docs, and experimental modules.

## Added
- Stryker sandbox workflow and isolation guidance documentation.
- Rapid mutation-hunting test suite and Jest compatibility mock for `node-fetch`.
- Experimental RAG modules and coin-exchange modules.

## Changed
- Backend API and startup flow updates in TypeScript service entrypoints.
- Test and mutation configuration improvements for deterministic mutation runs.
- Compiled `dist` artifacts refreshed to match latest source updates.
- Lockfile refreshed with safe dependency resolutions.

## Fixed
- Mutation pipeline raised to strict 100% score with stable sandbox execution.
- Jest/Stryker interoperability improvements and sandbox cleanup behavior.

## Security
- Applied `npm audit` remediations in root workspace.
- Verified clean audits in both root and frontend workspaces.

## Validation
- Mutation testing: 100.00% score in sandbox run.
- Jest: full suite passing.
- TypeScript build: passing.
```
