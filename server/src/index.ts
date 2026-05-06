import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import contactsRouter from './routes/contacts';
import templatesRouter from './routes/templates';
import emailsRouter from './routes/emails';
import uploadsRouter from './routes/uploads';
import trackingRouter from './routes/tracking';
import rateLimitRouter from './routes/rateLimit';
import { processScheduledEmails } from './services/emailService';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/contacts', contactsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/track', trackingRouter);
app.use('/api/rate-limit', rateLimitRouter);

// Error handler
app.use(errorHandler);

// Only start listening in non-Vercel environments
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
    // Poll every 30 seconds for due scheduled emails
    setInterval(() => {
      processScheduledEmails().catch((err) =>
        console.error('Scheduler error:', err)
      );
    }, 30_000);
  });
}

export default app;
