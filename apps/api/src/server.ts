import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import consultationRoutes from './routes/consultation.routes';
import recordsRoutes from './routes/records.routes';
import billingRoutes from './routes/billing.routes';
import { setupSocketServer } from './lib/socket';
import { getUploadDirectory } from './lib/storage';

const app = express();
const server = http.createServer(app);

// Port Configuration
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving for patient lab tests & prescriptions
app.use('/uploads', express.static(getUploadDirectory()));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TeleDoc Ghana API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount API Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/consultations', consultationRoutes);
app.use('/api/v1/records', recordsRoutes);
app.use('/api/v1/billing', billingRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Initialize Socket.io Real-time Chat
const io = setupSocketServer(server);

// Start Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏥 TeleDoc Ghana Backend API Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket / Socket.io server active`);
  console.log(`🗄️ Database: PostgreSQL (port 5433)`);
  console.log(`====================================================`);
});

export { app, server, io };
