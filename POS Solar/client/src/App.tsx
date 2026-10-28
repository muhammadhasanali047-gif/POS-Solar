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
import { AccessPage } from './pages/Access/AccessPage';
import { useAccessStore } from './stores/accessStore';

export const App: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isTabAllowed, fetchPermissions } = useAccessStore();

  const getDefaultTabForRole = (role?: string): NavItemKey => {
    if (role === 'MANAGER' || role === 'CASHIER') return 'quick-flow';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<NavItemKey>(() => getDefaultTabForRole(user?.role));

  // If role is explicitly specified in URL (e.g. ?role=manager) but existing session is CEO, auto-logout
  useEffect(() => {
    try {
      const urlStr = (window.location.search + window.location.hash + window.location.pathname).toLowerCase();
      if (urlStr.includes('manager') && user?.role && user.role !== 'MANAGER') {
        logout();
      } else if ((urlStr.includes('admin') || urlStr.includes('ceo')) && user?.role && user.role === 'MANAGER') {
        logout();
      }
    } catch {}
  }, [user, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPermissions();
    }
  }, [isAuthenticated, fetchPermissions]);

  // Enforce dynamic role access guards - Manager should never see Dashboard Overview
  useEffect(() => {
    if (!isTabAllowed(currentTab, user?.role) || (user?.role === 'MANAGER' && currentTab === 'dashboard')) {
      if (isTabAllowed('quick-flow', user?.role)) {
        setCurrentTab('quick-flow');
      } else if (isTabAllowed('pos', user?.role)) {
        setCurrentTab('pos');
      } else if (isTabAllowed('dashboard', user?.role)) {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab, isTabAllowed]);

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
      case 'access':
        return <AccessPage />;
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