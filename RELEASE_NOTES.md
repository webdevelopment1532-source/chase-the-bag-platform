# Release Notes

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
