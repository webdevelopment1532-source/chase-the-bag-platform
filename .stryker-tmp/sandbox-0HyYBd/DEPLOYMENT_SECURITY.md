# HTTPS/TLS, HSTS, and Secure Proxy Deployment

## HTTPS/TLS Enforcement
- All production deployments MUST use HTTPS (TLS 1.2 or higher).
- Never expose HTTP endpoints directly to the public internet.
- Use a reverse proxy (e.g., NGINX, HAProxy, cloud load balancer) to terminate TLS and forward requests to Fastify.

## HSTS (HTTP Strict Transport Security)
- Enable HSTS in your reverse proxy config:
  - Example (NGINX):
    ```
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    ```
- This ensures browsers only use HTTPS for your domain.

## Secure Cookies
- Set `secure: true` and `httpOnly: true` for all cookies (if/when used).
- Use `SameSite=Strict` or `SameSite=Lax` for all session/auth cookies.

## Proxy Headers
- Ensure your Fastify app trusts proxy headers for correct client IP and protocol:
  - In Fastify, set `trustProxy: true` if behind a proxy.
- Example:
  ```js
  const fastify = Fastify({ logger: true, trustProxy: true });
  ```

## TLS Best Practices
- Use strong ciphers and disable legacy protocols (SSLv3, TLS 1.0/1.1).
- Use certificates from a trusted CA (e.g., Let's Encrypt).
- Rotate certificates regularly and monitor for expiration.

## Reference
- [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
