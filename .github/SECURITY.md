# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | Yes                |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities via:

1. **Email**: security@uplytech.com
2. **GitHub Security Advisories**: Use the "Report a vulnerability" button on the Security tab

### What to include

- Type of vulnerability (XSS, SQL injection, authentication bypass, etc.)
- Steps to reproduce
- Affected endpoints or modules
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix & Release**: Depends on severity
  - Critical: Within 24 hours
  - High: Within 7 days
  - Medium: Within 30 days
  - Low: Next scheduled release

## Security Best Practices

This API implements:

- Argon2 password hashing
- JWT with short-lived access tokens and refresh token rotation
- Rate limiting on all endpoints
- Helmet security headers
- CORS with explicit origin allowlisting
- Input validation via Zod on all endpoints
- SQL injection prevention via Prisma ORM
- XSS prevention via output encoding
- CSRF protection
- Full audit logging
- API key scoping and expiration
