import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { vtuRouter } from '../server/vtuRoutes';
import { minimartRouter } from '../server/minimartRouter';
import { paystackRouter } from '../server/paystackRouter';
import { libraryRouter } from '../server/libraryRouter';

dotenv.config();

const app = express();

// CORS configuration
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (both /api/health and /health)
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// VTU Routes (support both with and without /api prefix for Vercel rewrites)
app.use('/api/vtu', vtuRouter);
app.use('/vtu', vtuRouter);

// Minimart Routes
app.use('/api/minimart', minimartRouter);
app.use('/minimart', minimartRouter);

// Paystack Routes
app.use('/api/paystack', paystackRouter);
app.use('/paystack', paystackRouter);

// Past Questions Academic Library Routes
app.use('/api/library', libraryRouter);
app.use('/library', libraryRouter);

// Fallback JSON 404 handler for API routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 'FAILED',
    error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
    message: `The endpoint '${req.originalUrl || req.url}' does not exist on this server.`,
  });
});

// Fallback JSON 500 error handler (prevents Vercel HTML error pages)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Unhandled Exception:', err);
  res.status(500).json({
    success: false,
    status: 'FAILED',
    error: err?.message || 'Internal Server Error',
    message: err?.message || 'An error occurred while processing the request.',
  });
});

export default function handler(req: Request, res: Response) {
  return app(req, res);
}

