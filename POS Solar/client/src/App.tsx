import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { MainLayout } from './components/layout/MainLayout';
import { NavItemKey } from './components/layout/Sidebar';
import { LoginPage } from './pages/Login/LoginPage';

import { QuickWorkflowPage } from './pages/QuickWorkflow/QuickWorkflowPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { PosPage } from './pages/POS/PosPage';
import { QuotationsPage } from './pages/Quotations/QuotationsPage';
import { PackagesPage } from './pages/Packages/PackagesPage';
import { ProductsPage } from './pages/Products/ProductsPage';
import { InventoryPage } from './pages/Inventory/InventoryPage';
import { SerialsPage } from './pages/Serials/SerialsPage';
import { CustomersPage } from './pages/Customers/CustomersPage';
import { SuppliersPage } from './pages/Suppliers/SuppliersPage';
import { InstallationsPage } from './pages/Installations/InstallationsPage';
import { WarrantiesPage } from './pages/Warranties/WarrantiesPage';
import { ClaimsPage } from './pages/Claims/ClaimsPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
import { DealersPage } from './pages/Dealers/DealersPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');

  // Enforce role guards if user role changes
  useEffect(() => {
    if (['expenses', 'dealers', 'reports'].includes(currentTab)) {
      setCurrentTab('dashboard');
    } else if (user?.role === 'CEO') {
      if (currentTab === 'settings') {
        setCurrentTab('dashboard');
      }
    } else if (user?.role === 'MANAGER') {
      if (currentTab === 'settings') {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'quick-flow':
        return <QuickWorkflowPage />;
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'pos':
        return <PosPage />;
      case 'quotations':
        return <QuotationsPage />;
      case 'packages':
        return <PackagesPage />;
      case 'products':
        return <ProductsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'serials':
        return <SerialsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'installations':
        return <InstallationsPage />;
      case 'warranties':
        return <WarrantiesPage />;
      case 'claims':
        return <ClaimsPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'dealers':
        return <DealersPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {renderContent()}
    </MainLayout>
  );
};

export default App;