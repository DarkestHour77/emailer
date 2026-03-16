import { env } from './env';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
    return cachedToken.accessToken;
  }

  const url = `https://login.microsoftonline.com/${env.azure.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: env.azure.clientId,
    client_secret: env.azure.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get Azure access token: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

export interface GraphMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; contentBytes: string; contentType: string }[];
}

export async function sendMailViaGraph(options: GraphMailOptions): Promise<void> {
  const token = await getAccessToken();

  const message: any = {
    subject: options.subject,
    body: {
      contentType: 'HTML',
      content: options.html,
    },
    toRecipients: [
      {
        emailAddress: { address: options.to },
      },
    ],
  };

  if (options.attachments && options.attachments.length > 0) {
    message.attachments = options.attachments.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.filename,
      contentType: a.contentType,
      contentBytes: a.contentBytes,
    }));
  }

  const url = `https://graph.microsoft.com/v1.0/users/${env.senderEmail}/sendMail`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API sendMail failed: ${err}`);
  }
}
