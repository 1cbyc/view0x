# Security Policy

> **Secrets, `.env`, rotation, VPS, and git history:** see the repo-root **[SECURITY.md](../SECURITY.md)**.

## PII Data Handling

### Analytics Exports

All analytics data exports from the view0x platform implement automatic PII (Personally Identifiable Information) masking to protect user privacy:

**Masked Fields:**
- **User ID**: Only the last 4 characters are shown (e.g., `***1234`)
- **IP Address**: First three octets are masked (e.g., `***.***.***.123`)

**Export Formats:**
- JSON exports: PII fields are masked before serialization
- CSV exports: Uses `csv-stringify` library with automatic escaping to prevent CSV injection attacks

### Implementation

The PII masking is implemented in `/backend/src/controllers/analyticsController.ts`:

```typescript
const sanitizedData = analytics.map(record => ({
    timestamp: record.timestamp.toISOString(),
    endpoint: record.endpoint,
    method: record.method,
    statusCode: record.statusCode,
    responseTime: record.responseTime,
    userId: record.userId ? `***${record.userId.toString().slice(-4)}` : "",
    ipAddress: record.ipAddress ? record.ipAddress.replace(/\d+\.\d+\.\d+\./, "***.***.***.") : "",
}));
```

### Compliance

This approach helps ensure compliance with:
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Other privacy regulations requiring PII protection

## Reporting Security Issues

If you discover a security vulnerability, please email [security@view0x.com](mailto:security@view0x.com) with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please do not publicly disclose security vulnerabilities until they have been addressed.**

## Security Best Practices

### For Developers

1. **Never commit secrets**: Use `.env` files and environment variables
2. **Validate all inputs**: Implement proper validation on all API endpoints
3. **Use parameterized queries**: Prevent SQL injection with ORM/parameterized queries
4. **Sanitize outputs**: Prevent XSS by sanitizing all user-generated content
5. **Keep dependencies updated**: Regularly run `npm audit` and update packages

### For Deployments

1. **Use HTTPS**: Always use TLS/SSL in production
2. **Set secure headers**: Implement CSP, HSTS, X-Frame-Options, etc.
3. **Enable rate limiting**: Protect against DDoS and brute force attacks
4. **Monitor logs**: Set up alerting for suspicious activities
5. **Regular backups**: Maintain encrypted backups of all data

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API request throttling
- **Input Validation**: Comprehensive validation on all endpoints
- **CSRF Protection**: Cross-site request forgery prevention
- **SQL Injection Prevention**: Parameterized queries via Sequelize ORM
- **XSS Prevention**: Output escaping and Content Security Policy

## Security Scan Results

Security scans are run automatically on every pull request using:
- OWASP ZAP for vulnerability scanning
- npm audit for dependency vulnerabilities
- Playwright for security test automation

Results are available in the GitHub Actions artifacts for each PR.
