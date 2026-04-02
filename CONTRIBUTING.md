# Contributing Guidelines

## Access & Permissions
- This repository is private and invite-only.
- Only trusted, top-tier developers are granted access.
- All contributors must follow the Oath and guidelines in the README.

## Code Review & Branch Protection
- All changes must be submitted via pull request (PR) to the `main` branch.
- At least one core team member must review and approve each PR.
- All tests and security checks must pass before merging.
- No direct pushes to `main` are allowed.

## Best Practices & Optimization
- Write clean, maintainable, and well-documented code.
- Optimize for performance and security.
- Add or update tests for all new features.
- Use GitHub Actions for automated linting, testing, and coverage.

## Security
- Never commit secrets or sensitive data.
- Report vulnerabilities to the core team immediately.

## Platform Compliance
- All bot behavior must remain compliant with Discord Terms of Service and Community Guidelines.
- All repository activity must remain compliant with GitHub Terms and Acceptable Use policies.
- Features must remain entertainment-only and must not enable real-money gambling flows.
- New integrations must include rate-limit protections, auditability, and abuse controls before merge.

## Release Gate
- Required before merge: `npm run build`
- Required before merge: `npm test -- --runInBand`
- Required for robustness sweeps: `npm run stryker:sandbox`
- Required for runtime verification: `npm run monitor:stack`

## Contact
- For questions or access requests, contact the project owner or a core team member.
