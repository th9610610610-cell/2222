# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability in Lotto Win, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email: Send details to the project maintainer via the contact in the repository profile.
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fix (optional)

### Response Timeline

- **Acknowledgement**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix & disclosure**: Within 30 days (depending on severity)

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Always validate and sanitize user input server-side
- Use parameterized queries (Drizzle ORM handles this)
- Follow the principle of least privilege for all DB access
- Keep dependencies updated (Dependabot is enabled)
