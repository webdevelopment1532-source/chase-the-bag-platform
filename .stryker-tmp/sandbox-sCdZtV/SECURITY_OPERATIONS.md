# Security Operations: Penetration Testing, Code Audits, and Zero-Trust

## Penetration Testing
- Schedule regular penetration tests (internal and external) at least quarterly.
- Use both automated tools (OWASP ZAP, Burp Suite) and manual testing.
- Remediate all findings promptly and document fixes.

## Code Audits
- Conduct regular code reviews with a focus on security (peer review, static analysis).
- Integrate SAST (Static Application Security Testing) tools into CI/CD (e.g., SonarQube, CodeQL).
- Require security sign-off before major releases.

## Zero-Trust Architecture
- Enforce least privilege for all services, users, and APIs.
- Require MFA for all admin and privileged access.
- Segment networks and restrict lateral movement (microsegmentation).
- Monitor and log all access, with real-time alerting for suspicious activity.
- Assume breach: design for rapid detection, containment, and recovery.

## Checklist
- [ ] Penetration test scheduled and documented
- [ ] Code audit and SAST integrated in CI/CD
- [ ] Zero-trust policies enforced in infrastructure and application

## References
- [Zero Trust Architecture (NIST)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
