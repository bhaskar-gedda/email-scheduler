import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ComposeModal } from '../../pages/ComposeModal';

export interface DashboardLayoutContextType {
  searchQuery: string;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

export const DashboardLayout: React.FC = () => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.includes('/sent')) return 'Sent Emails';
    return 'Scheduled Emails';
  };

  const triggerRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc]">
      {/* Left Sidebar */}
      <Sidebar onOpenCompose={() => setIsComposeOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getPageTitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={triggerRefresh}
          refreshing={refreshing}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ searchQuery, refreshTrigger, triggerRefresh }} />
          </div>
        </main>
      </div>

      {/* Global Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onCampaignScheduled={triggerRefresh}
      />
    </div>
  );
};
