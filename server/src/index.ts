import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import contactsRouter from './routes/contacts';
import templatesRouter from './routes/templates';
import emailsRouter from './routes/emails';
import schedulesRouter from './routes/schedules';
import trackingRouter from './routes/tracking';
import uploadsRouter from './routes/uploads';
import { init as initScheduler } from './services/schedulerService';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/contacts', contactsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/uploads', uploadsRouter);

// Tracking routes (public, no /api prefix)
app.use('/t', trackingRouter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Error handler
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
  initScheduler().catch(console.error);
});
