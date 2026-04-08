# Frontend Security Automation & Performance Monitoring

## Security Automation
- Use [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (Content Security Policy) and [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (Subresource Integrity) in all frontend builds.
- Run [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit) and [Snyk](https://snyk.io/) for frontend dependencies.
- Use [Retire.js](https://retirejs.github.io/retire.js/) or [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) for client-side vulnerability scanning.
- Lint for unsafe patterns (e.g., eval, innerHTML) with ESLint security plugins.

## Performance Monitoring
- Integrate [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) for automated performance, accessibility, and best-practice checks.
- Use [Sentry](https://sentry.io/) or [LogRocket](https://logrocket.com/) for real-time error and performance monitoring in production.

### Example: Lighthouse CI GitHub Action
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Build frontend
        run: npm run build
      - name: Install Lighthouse CI
        run: npm install -g @lhci/cli
      - name: Run Lighthouse CI
        run: lhci autorun
```

## References
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Sentry](https://docs.sentry.io/platforms/javascript/)
- [Retire.js](https://retirejs.github.io/retire.js/)
