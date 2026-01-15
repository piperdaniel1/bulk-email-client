import { useCallback, useState, useEffect } from 'react';
import { useThreads } from '@/hooks/useThreads';
import { useRealtimeEmails } from '@/hooks/useRealtimeEmails';
import { EmailListItem } from './EmailListItem';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

interface EmailListProps {
  addressId?: string;
  searchQuery?: string;
}

export function EmailList({ addressId, searchQuery }: EmailListProps) {
  const { threads, loading, refetch } = useThreads({ addressId });
  const [filteredThreads, setFilteredThreads] = useState(threads);

  // Real-time subscription
  const { requestNotificationPermission } = useRealtimeEmails({
    addressId,
    onNewEmail: useCallback(() => {
      refetch();
    }, [refetch]),
  });

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Filter threads based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredThreads(threads);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredThreads(
      threads.filter((thread) => {
        const email = thread.latest_email;
        if (!email) return false;

        return (
          thread.subject?.toLowerCase().includes(query) ||
          email.from_address.toLowerCase().includes(query) ||
          email.from_name?.toLowerCase().includes(query) ||
          email.body_text?.toLowerCase().includes(query)
        );
      })
    );
  }, [threads, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        }
        title={searchQuery ? 'No emails match your search' : 'No emails yet'}
        description={
          searchQuery
            ? 'Try adjusting your search terms'
            : 'Emails will appear here when you receive them'
        }
      />
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {filteredThreads.map((thread) => (
        <EmailListItem key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
