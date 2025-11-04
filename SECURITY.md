# Security Guidelines

## Credential Management

### ⚠️ IMPORTANT: Production Credentials

**NEVER commit production credentials to version control.**

The `.env-1.production` file uses placeholder syntax `${VARIABLE_NAME}` for sensitive credentials. These must be set through:

1. **Environment Variables** (recommended for deployment platforms):
   ```bash
   export WASABI_ACCESS_KEY="your-actual-key"
   export WASABI_SECRET_KEY="your-actual-secret"
   ```

2. **Secrets Management Systems**:
   - GitHub Secrets (for GitHub Actions)
   - AWS Secrets Manager
   - HashiCorp Vault
   - Other secret management solutions

3. **Deployment Platform Configuration**:
   - Heroku Config Vars
   - Vercel Environment Variables
   - Netlify Environment Variables
   - etc.

### Setting Up Production Credentials

Before deploying to production:

1. Obtain your Wasabi credentials from the Wasabi console
2. Set them as environment variables on your deployment platform:
   ```
   WASABI_ACCESS_KEY=<your-access-key>
   WASABI_SECRET_KEY=<your-secret-key>
   ```

3. The application will automatically read these from the environment

### Security Best Practices

1. **Never hardcode credentials** in source code
2. **Use environment variables** for all sensitive data
3. **Rotate credentials regularly**
4. **Use different credentials** for development, staging, and production
5. **Limit access scope** - use IAM policies to grant minimum required permissions
6. **Enable MFA** on accounts with access to production credentials
7. **Monitor access logs** regularly for suspicious activity

### Development vs Production

- **Development**: Can use local `.env` file (never committed)
- **Production**: Must use environment variables or secrets management

### Credential Rotation

If credentials are compromised:

1. Immediately revoke the old credentials in Wasabi console
2. Generate new credentials
3. Update environment variables on all deployment platforms
4. Restart the application to pick up new credentials
5. Monitor logs for any unauthorized access attempts

### What to Commit

✅ **Safe to commit**:
- `.env.example` (with placeholder values)
- `.env-1.production` (with `${VARIABLE}` syntax)
- Configuration file templates

❌ **Never commit**:
- `.env` (contains real values)
- Any file with actual credentials
- Private keys
- API tokens
- Database passwords

### If Credentials Are Accidentally Committed

1. **Immediately revoke** the exposed credentials
2. **Generate new credentials** 
3. **Remove from git history** using tools like `git-filter-repo` or BFG Repo-Cleaner
4. **Force push** the cleaned repository
5. **Update** all environments with new credentials
6. **Notify** team members of the incident

### Additional Resources

- [Wasabi Security Best Practices](https://wasabi-support.zendesk.com/hc/en-us/articles/360015106491-What-are-the-Wasabi-security-best-practices-)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
