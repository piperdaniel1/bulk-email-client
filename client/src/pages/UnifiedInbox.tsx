import { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmailList } from '@/components/email/EmailList';

export function UnifiedInbox() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <AppShell onSearch={handleSearch}>
      <div className="h-full bg-white">
        <EmailList searchQuery={searchQuery} />
      </div>
    </AppShell>
  );
}
