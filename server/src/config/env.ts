import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  },
  senderEmail: process.env.SENDER_EMAIL || 'noreply@emailer.dev',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || '3001'}`,
  ses: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_DEFAULT_REGION || 'ap-south-1',
    sourceEmail: process.env.AWS_SES_FROM_EMAIL || '',
    senderName: process.env.SES_SENDER_NAME || '',
  },
};
