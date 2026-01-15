import { ReactNode, useState, useCallback } from 'react';
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

  const handleCreateAddress = useCallback(() => {
    setShowCreateAddress(true);
  }, []);

  const handleCompose = useCallback(() => {
    setShowCompose(true);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onCreateAddress={handleCreateAddress} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onSearch={onSearch}
          onCompose={handleCompose}
          onCreateAddress={handleCreateAddress}
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
