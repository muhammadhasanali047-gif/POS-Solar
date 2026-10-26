import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { testFirestoreConnection, isFirebaseConnected, projectId } from './config/firebase';

// Route imports
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import productRoutes from './routes/productRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import serialRoutes from './routes/serialRoutes';
import packageRoutes from './routes/packageRoutes';
import quotationRoutes from './routes/quotationRoutes';
import saleRoutes from './routes/saleRoutes';
import customerRoutes from './routes/customerRoutes';
import supplierRoutes from './routes/supplierRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import installationRoutes from './routes/installationRoutes';
import warrantyRoutes from './routes/warrantyRoutes';
import claimRoutes from './routes/claimRoutes';
import expenseRoutes from './routes/expenseRoutes';
import dealerRoutes from './routes/dealerRoutes';
import reportRoutes from './routes/reportRoutes';
import syncRoutes from './routes/syncRoutes';

const app = express();

// Global Middlewares
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes Mounting (/api/v1/...)
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/serials`, serialRoutes);
app.use(`${API_PREFIX}/packages`, packageRoutes);
app.use(`${API_PREFIX}/quotations`, quotationRoutes);
app.use(`${API_PREFIX}/sales`, saleRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/suppliers`, supplierRoutes);
app.use(`${API_PREFIX}/purchases`, purchaseRoutes);
app.use(`${API_PREFIX}/installations`, installationRoutes);
app.use(`${API_PREFIX}/warranties`, warrantyRoutes);
app.use(`${API_PREFIX}/claims`, claimRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/dealers`, dealerRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/sync`, syncRoutes);

// Root & Health Endpoints
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="refresh" content="1; url=http://localhost:5173">
      <title>Solar POS - API Service</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #111827; padding: 2.5rem; border-radius: 1.25rem; text-align: center; border: 1px solid #1f2937; box-shadow: 0 20px 40px rgba(0,0,0,0.6); max-width: 520px; }
        h1 { color: #f59e0b; font-size: 1.5rem; margin-top: 0; }
        p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; }
        .badge { display: inline-block; background: #064e3b; color: #34d399; font-weight: bold; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; }
        .btn { display: inline-block; background: #f59e0b; color: #111827; font-weight: 800; text-decoration: none; padding: 0.85rem 1.75rem; border-radius: 0.75rem; margin-top: 1.25rem; font-size: 0.95rem; transition: transform 0.1s, background 0.2s; }
        .btn:hover { background: #d97706; transform: translateY(-1px); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">● Central API Online</div>
        <h1>Solar POS Backend (Port 5000)</h1>
        <p>Port 5000 is the <strong>Backend REST API</strong> service. The interactive desktop/web user interface is running on <strong>Port 5173</strong>.</p>
        <a class="btn" href="http://localhost:5173">Open Solar POS Frontend (localhost:5173) &rarr;</a>
      </div>
    </body>
    </html>
  `);
});

// Health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Solar POS & Inventory Management System (ERP)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Process level safety handlers
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const PORT = Number(ENV.PORT) || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(` Solar POS & Inventory Management System - Central API`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(` Environment: ${ENV.NODE_ENV}`);
  console.log(` Central Database (Local SQLite): Connected`);
  
  if (isFirebaseConnected) {
    console.log(` Firebase Project: ${projectId}`);
    try {
      const fbCheck = await testFirestoreConnection();
      if (fbCheck.success) {
        console.log(` Cloud Database (Firebase Firestore): LIVE & CONNECTED`);
      } else {
        console.warn(` Cloud Database (Firebase Firestore): ${fbCheck.message}`);
      }
    } catch (e: any) {
      console.warn(` Cloud Database (Firebase Firestore): Ping failed - ${e.message}`);
    }
  } else {
    console.log(` Cloud Database (Firebase Firestore): Disabled / Not Configured`);
  }
  console.log(`=======================================================`);
});

export default app;