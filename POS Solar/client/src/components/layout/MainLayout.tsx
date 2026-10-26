import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar, NavItemKey } from './Sidebar';
import { PrintableDocument } from '../print/PrintableDocument';

interface MainLayoutProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentTab, onSelectTab, children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-950 relative">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          currentTab={currentTab}
          onOpenPos={() => onSelectTab('pos')}
          onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-4 lg:p-5 custom-scrollbar">
          <div className="max-w-[1920px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Global Printable Document Mount for Hardware & PDF Printing */}
      <PrintableDocument />
    </div>
  );
};