# IT Networking and Deployment Security

## Network Architecture Recommendations

- **Reverse Proxy:** Deploy Fastify behind a secure reverse proxy (e.g., NGINX, HAProxy) with TLS 1.2+.
- **TLS/HTTPS:** Enforce HTTPS for all external traffic. Redirect all HTTP to HTTPS at the proxy layer.
- **Firewall:**
  - Allow only required ports (e.g., 443 for HTTPS, 4000 for internal API).
  - Deny all other inbound and outbound traffic by default.
  - Restrict DB access to backend servers only (private subnet).
- **Network Segmentation:**
  - Separate backend, database, and admin interfaces into different subnets/VLANs.
  - Use security groups or network ACLs to enforce least privilege.
- **DDoS Protection:**
  - Use cloud provider DDoS protection or a WAF (Web Application Firewall).
- **Secrets Management:**
  - Store all credentials and secrets in a secure vault (e.g., AWS Secrets Manager, Azure Key Vault).
- **Monitoring & Logging:**
  - Centralize logs and monitor for suspicious activity (SIEM integration recommended).
  - Enable alerting for audit log anomalies and failed login attempts.
- **Backup & Recovery:**
  - Regularly back up databases and critical configs. Test restore procedures.

## Example Cloud Deployment Checklist

- [ ] TLS certificate installed and enforced
- [ ] Firewall rules applied (allow 443, deny all else)
- [ ] DB not exposed to public internet
- [ ] Reverse proxy configured for HTTPS and forwarding
- [ ] Secrets loaded from environment or vault
- [ ] Logging and monitoring enabled
- [ ] Regular vulnerability scans scheduled

## References
- [OWASP Secure Deployment](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Deployment_Cheat_Sheet.html)
- [CNCF Cloud Security Whitepaper](https://github.com/cncf/tag-security/blob/main/whitepaper/cloud-native-security-whitepaper.md)
