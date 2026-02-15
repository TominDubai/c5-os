import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// DocuSign API configuration
const OAUTH_BASE_PATH = process.env.DOCUSIGN_OAUTH_BASE_PATH || 'account-d.docusign.com';
const PRIVATE_KEY_FILE = path.join(process.cwd(), 'config', 'docusign-private.key');

interface DocuSignAuth {
  accessToken: string;
  baseUri: string;
  accountId: string;
}

interface EnvelopeArgs {
  signerEmail: string;
  signerName: string;
  docBase64: string;
  docName: string;
  docExtension: string;
  emailSubject: string;
}

/**
 * Generate JWT assertion for DocuSign OAuth
 */
function generateJWT(): string {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
  const userId = process.env.DOCUSIGN_USER_ID!;
  const privateKey = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiration

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  // JWT Payload
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: OAUTH_BASE_PATH,
    iat: now,
    exp: exp,
    scope: 'signature impersonation'
  };

  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA private key
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();
  const signature = sign.sign(privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Get DocuSign access token and account info
 */
export async function getDocuSignAuth(): Promise<DocuSignAuth> {
  try {
    const jwt = generateJWT();

    // Request access token
    const tokenResponse = await fetch(`https://${OAUTH_BASE_PATH}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info to find account and base URI
    const userInfoResponse = await fetch(`https://${OAUTH_BASE_PATH}/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();
    const account = userInfo.accounts?.find(
      (a: any) => a.account_id === process.env.DOCUSIGN_ACCOUNT_ID
    );

    if (!account) {
      throw new Error('Target account not found in user info');
    }

    return {
      accessToken,
      baseUri: account.base_uri,
      accountId: account.account_id,
    };
  } catch (error) {
    console.error('DocuSign Auth Error:', error);
    throw new Error('Failed to authenticate with DocuSign');
  }
}

/**
 * Create and send an envelope for signing
 */
export async function sendEnvelope(args: EnvelopeArgs): Promise<string> {
  const auth = await getDocuSignAuth();

  // Create envelope definition
  const envelopeDefinition = {
    emailSubject: args.emailSubject,
    status: 'sent',
    documents: [
      {
        documentBase64: args.docBase64,
        name: args.docName,
        fileExtension: args.docExtension,
        documentId: '1',
      },
    ],
    recipients: {
      signers: [
        {
          email: args.signerEmail,
          name: args.signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                recipientId: '1',
                tabLabel: 'SignHereTab',
                xPosition: '200',
                yPosition: '600',
              },
            ],
          },
        },
      ],
    },
  };

  // Send envelope via REST API
  const response = await fetch(
    `${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create envelope: ${error}`);
  }

  const result = await response.json();
  return result.envelopeId;
}

/**
 * Get envelope status
 */
export async function getEnvelopeStatus(envelopeId: string): Promise<any> {
  const auth = await getDocuSignAuth();

  const response = await fetch(
    `${auth.baseUri}/restapi/v2.1/accounts/${auth.accountId}/envelopes/${envelopeId}`,
    {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get envelope status');
  }

  return response.json();
}
