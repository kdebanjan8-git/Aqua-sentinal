import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { initDatabase } from './config/db.js';
import { initSocketServer } from './sockets/socketHandler.js';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Security & Utility Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'aqua-sentinel-backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Server & WebSocket
async function startServer() {
  await initDatabase();
  initSocketServer(server, CORS_ORIGIN);

  server.listen(PORT, () => {
    console.log(`🚀 AquaSentinel Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket Gateway ready for live sensor & outbreak feeds`);
  });
}

startServer();

export { app, server };
