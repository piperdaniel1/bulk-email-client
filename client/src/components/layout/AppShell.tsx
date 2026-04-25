import { ReactNode, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateAddressModal } from '@/components/address/CreateAddressModal';
import { ComposeModal } from '@/components/email/ComposeModal';

interface AppShellProps {
  children: ReactNode;
  onSearch?: (query: string) => void;
}

export function AppShell({ children, onSearch }: AppShellProps) {
  const [showCreateAddress, setShowCreateAddress] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleCreateAddress = useCallback(() => {
    setShowCreateAddress(true);
  }, []);

  const handleCompose = useCallback(() => {
    setShowCompose(true);
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        onCreateAddress={handleCreateAddress}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onSearch={onSearch}
          onCompose={handleCompose}
          onCreateAddress={handleCreateAddress}
          onOpenSidebar={openSidebar}
        />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CreateAddressModal
        isOpen={showCreateAddress}
        onClose={() => setShowCreateAddress(false)}
      />

      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
      />
    </div>
  );
}
