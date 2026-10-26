# Solar POS & Inventory Management System (ERP)

A complete, production-ready, responsive enterprise desktop & web application designed specifically for solar panel trading and installation companies.

## 🚀 Key Features

1. **Complete Solar Business Workflow**:
   ```
   Quotation → Approved Sale → Payment Ledger → Inventory Auto-Deduction → Installation Checklist → Serial & Warranty Activation → Profitability Reports
   ```
2. **Offline-First Synchronization Engine**:
   - Write-through queue with UUID generation.
   - Immediate UI responsiveness even with zero internet connectivity.
   - Background FIFO synchronization worker that pushes pending records to the central cloud API upon reconnect.
   - Zero data loss guarantee (local transactions are only cleared after explicit central database confirmation).
3. **Role-Based Access Control (RBAC)**:
   - **Admin**: Complete system governance (all 15 modules, staff management, system settings).
   - **CEO Portal**: Executive analytics, company-wide revenue & profitability, warranty loss ratio, and read-only oversight into Dealer Management.
   - **Manager**: Full operational authority over stock movements, supplier POs, sales, quotations, payments, and full ownership of Dealer Management.
   - **Dealer Management (Shared)**: Dealer profile cards, linked customers and installations, commission ledgers (Earned / Pending / Paid), and balance payouts.
4. **15 Core Modules Built**:
   - **Dashboard**: 4/2/1-column responsive grid, live KPIs, Recharts sales trends, low-stock warnings.
   - **Product Catalog**: Category → Brand → Product → Variant / SKU hierarchy with full electrical specs.
   - **Inventory & Warehouses**: Real-time multi-warehouse stock balances, damage write-offs, inward/outward movement logs.
   - **Serial Number Lifecycle**: Universal serial search tracing items from import to sale, installation, and RMA claims.
   - **Quotation Management**: Multi-component solar quotation builder with **1-Click Convert to Sale Invoice**.
   - **Solar Packages**: Pre-configured turn-key bundles (5kW, 10kW, 15kW, 20kW) with component pickers.
   - **POS & Billing**: High-speed checkout, barcode scanner, partial/split payments, stock auto-deduction.
   - **Customers CRM**: Customer directories, payment history ledgers, outstanding balances.
   - **Suppliers & Procurement**: Purchase orders (POs), shipment inwards, accounts payable ledger.
   - **Installation Management**: Site jobs, team assignment, and 8-point sign-off inspection checklist.
   - **Warranty Certificates**: Serialized product warranties, duration tracking, and automated expiry calculation.
   - **Claims & RMA**: Complete claim lifecycle (complaint, diagnosis, replacement serial swap, cost tracking).
   - **Operating Expenses**: 10 expense categories with Sales Revenue → Gross Profit → Expenses → Net Profit.
   - **Shared Dealer Module**: Dedicated profile cards and commission payout workflows.
   - **Reports & BI**: Sales, Inventory, Financial, and Solar Business reports with CSV & PDF export.
   - **Settings & Sync**: User management, branch config, and offline sync diagnostics.

---

## 💻 Tech Stack

- **Desktop Shell**: Electron (Windows primary target, cross-platform)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Zustand, TanStack Query
- **Backend**: Node.js, Express, TypeScript, JWT Auth, RBAC Middleware, Audit Logging
- **Database**: 
  - Central Database: **MySQL** (Hostinger production target), with local standalone SQLite mode for instant local testing.
  - Local Offline Database: SQLite write-through queue with UUID idempotency.

---

## 🔑 Default Login Credentials

| Role | Email | Password | Scope |
|---|---|---|---|
| **Admin** | `admin@solarpos.com` | `Solar123!` | Unrestricted access to all modules, users, and settings |
| **CEO** | `ceo@solarpos.com` | `Solar123!` | Executive dashboard, reports, analytics, shared Dealer Management |
| **Manager** | `manager@solarpos.com` | `Solar123!` | Inventory, purchases, sales, POS, quotations, shared Dealer Management |

*(Quick 1-Click login buttons are also provided directly on the Login screen).*

---

## 🛠️ Quickstart & Development

### 1. Run Backend Server
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
```
Backend API will start on: `http://localhost:5000`

### 2. Run Desktop / Web Client
```bash
cd client
npm install
npm run dev
```
Client interface will launch on: `http://localhost:5173`

### 3. Run Everything Concurrently
From the root project folder:
```bash
npm run dev
```

---

## 🌐 Production Hostinger MySQL Deployment

To point the central server to your Hostinger MySQL database:
1. Open `server/.env`.
2. Update the `DATABASE_URL` with your Hostinger MySQL credentials:
   ```env
   DATABASE_URL="mysql://u123456_solar:YourHostingerPassword@srv123.hostinger.com:3306/u123456_solar_erp"
   ```
3. Run the MySQL migration:
   ```bash
   cd server
   npx prisma db push --schema=prisma/schema.mysql.prisma
   npx ts-node prisma/seed.ts
   ```