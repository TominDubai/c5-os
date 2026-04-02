# DocuSign Integration Test Results

**Date:** 2026-02-15
**Status:** ⚠️ Requires Setup

## Test Summary

| Test | Status | Notes |
|------|--------|-------|
| Credentials Check | ✅ PASS | All environment variables configured |
| Database Query | ✅ PASS | Found test quote in database |
| PDF Generation | ✅ PASS | Quote structure valid |
| DocuSign Auth | ⚠️ SKIP | Not tested (would consume credits) |
| API Validation | ❌ FAIL | Parameter validation issue |

## Critical Issue: Consent Required

**Error from logs:**
```
DocuSign Auth Error: Error: Failed to get access token: {"error":"consent_required"}
```

### What This Means
DocuSign JWT authentication requires **one-time user consent** before it will work. This is a security requirement from DocuSign.

### How to Fix

#### Option 1: Grant Consent via Browser (Recommended)

1. **Build the consent URL** - Replace with your actual values:
   ```
   https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=60bcbd22-2993-4c78-86d4-526ba6903c31&redirect_uri=https://localhost
   ```

2. **Open in browser** - You'll be prompted to log in to DocuSign and grant consent

3. **Complete the flow** - After granting consent, you'll be redirected (the redirect will fail, but that's OK)

4. **Consent is now granted** - Your JWT authentication will work from now on

#### Option 2: Use Individual Consent Grant Endpoint

```bash
curl -X POST https://account-d.docusign.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE_FROM_STEP_1&client_id=60bcbd22-2993-4c78-86d4-526ba6903c31"
```

## Test Quote Details

- **ID:** `8bd56fac-9c51-4b39-a24f-19b35e7c22de`
- **Status:** draft
- **Has Items:** Yes (1 item)
- **Client Name:** Not set

## Next Steps

1. ✅ **Complete consent flow** (see above)
2. ✅ **Test DocuSign send** via UI or API
3. ✅ **Verify envelope creation** in DocuSign dashboard
4. ✅ **Add authentication** to API route (currently unprotected)

## API Endpoint Test

Once consent is granted, test with:

```bash
curl -X POST http://localhost:3001/api/docusign/send-quote \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "8bd56fac-9c51-4b39-a24f-19b35e7c22de",
    "signerEmail": "your-email@example.com",
    "signerName": "Test Signer"
  }'
```

## Security Notes

⚠️ **Important:** The `/api/docusign/send-quote` endpoint currently has NO authentication. Anyone can send envelopes via your DocuSign account. Add auth middleware before deploying to production.

## Files Tested

- `src/lib/docusign/client.ts` - JWT generation and REST API calls
- `src/app/api/docusign/send-quote/route.ts` - API endpoint
- `src/lib/pdf/generate-quote.ts` - PDF generation
- `config/docusign-private.key` - RSA private key (exists)

## References

- DocuSign JWT Guide: https://developers.docusign.com/platform/auth/jwt/
- Individual Consent: https://developers.docusign.com/platform/auth/consent/
