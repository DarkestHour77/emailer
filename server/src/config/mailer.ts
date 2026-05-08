import { env } from './env';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Create a singleton SES client for reuse
const sesClient = new SESClient({
  region: env.ses.region,
  credentials: {
    accessKeyId: env.ses.accessKeyId,
    secretAccessKey: env.ses.secretAccessKey,
  },
});

/**
 * Sends an email via AWS SES using the AWS SDK for JavaScript (v3).
 * This replaces the previous Python-based implementation.
 */
export async function sendMailViaSES(options: GraphMailOptions): Promise<void> {
  const source = env.ses.sourceEmail;
  if (!source) {
    throw new Error('AWS_SES_FROM_EMAIL is not set in environment variables.');
  }

  const senderName = env.ses.senderName;
  const sourceAddr = senderName ? `${senderName} <${source}>` : source;

  const command = new SendEmailCommand({
    Source: sourceAddr,
    Destination: {
      ToAddresses: [options.to],
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: options.html, // Use HTML as fallback plain text
          Charset: 'UTF-8',
        },
        ...(options.html && {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
        }),
      },
    },
  });

  try {
    await sesClient.send(command);
  } catch (err: any) {
    throw new Error(`SES sendMailViaSES failed: ${err.message}`);
  }
}

export interface GraphMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; contentBytes: string; contentType: string }[];
}
