# Automated Dependency Scanning and CVE Monitoring

## Best Practices
- Use automated tools to scan for known vulnerabilities (CVEs) in all dependencies.
- Integrate scanning into CI/CD so every PR and deploy is checked.
- Monitor for new vulnerabilities and patch promptly.

## Recommended Tools
- **npm audit**: Built-in for Node.js projects. Run `npm audit --production` regularly.
- **Snyk**: Free for open source, integrates with GitHub Actions and CI/CD.
- **Dependabot**: GitHub-native, auto-opens PRs for vulnerable dependencies.
- **OWASP Dependency-Check**: CLI and CI integration for broad language support.

## Example GitHub Actions Workflow (Dependabot + npm audit)
```yaml
# .github/workflows/dependency-audit.yml
name: Dependency Audit
on:
  schedule:
    - cron: '0 2 * * *' # daily at 2am UTC
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run npm audit
        run: npm audit --production --audit-level=high
```

## References
- [npm audit docs](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Dependabot](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
