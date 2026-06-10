## Description
<!-- What does this PR do? -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Security fix
- [ ] Database migration
- [ ] Refactoring
- [ ] Documentation

## Security Checklist
<!-- Complete this for any PR touching auth, payments, or user data -->
- [ ] No secrets or API keys added to code
- [ ] User input is validated/sanitized before use
- [ ] No new SQL built from raw user strings (use parameterized queries / Drizzle ORM)
- [ ] Auth middleware applied to all new protected routes
- [ ] Rate limiting considered for new endpoints
- [ ] Any new DB columns/tables have appropriate indexes and constraints
- [ ] OTP/token expiry enforced (never persist forever)
- [ ] No sensitive data logged or exposed in error messages

## Testing
- [ ] Tested locally
- [ ] Edge cases considered

## Screenshots (if UI change)
<!-- Add before/after screenshots if applicable -->
