import { useState, useEffect, useCallback } from 'react';
import { useEmails } from '@/hooks/useEmails';
import { useRealtimeEmails } from '@/hooks/useRealtimeEmails';
import { MessageBubble } from './MessageBubble';
import { QuickReply } from './QuickReply';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Email } from '@/types';

interface ThreadMessagesProps {
  threadId: string;
  subject: string | null;
}

export function ThreadMessages({ threadId, subject }: ThreadMessagesProps) {
  const { emails, loading, markAsRead, refetch, setEmails } = useEmails({ threadId });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Mark emails as read when viewing thread
  useEffect(() => {
    const unreadIds = emails
      .filter((e) => !e.read_at && e.direction === 'inbound')
      .map((e) => e.id);

    if (unreadIds.length > 0) {
      unreadIds.forEach((id) => markAsRead(id));
    }
  }, [emails, markAsRead]);

  // Expand all messages by default, collapse all but first and last when many
  useEffect(() => {
    if (emails.length <= 3) {
      setExpandedIds(new Set(emails.map((e) => e.id)));
    } else {
      // Show first and last expanded
      setExpandedIds(new Set([emails[0]?.id, emails[emails.length - 1]?.id].filter(Boolean)));
    }
  }, [emails]);

  // Real-time updates for this thread
  useRealtimeEmails({
    onNewEmail: useCallback(
      (email: Email) => {
        if (email.thread_id === threadId) {
          setEmails((prev) => {
            // Avoid duplicates from race between refetch and realtime
            if (prev.some((e) => e.id === email.id)) {
              return prev;
            }
            return [...prev, email];
          });
          setExpandedIds((prev) => new Set([...prev, email.id]));
        }
      },
      [threadId, setEmails]
    ),
  });

  const toggleExpanded = useCallback((emailId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(emails.map((e) => e.id)));
  }, [emails]);

  const collapseAll = useCallback(() => {
    if (emails.length > 0) {
      setExpandedIds(new Set([emails[emails.length - 1].id]));
    }
  }, [emails]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const lastEmail = emails[emails.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {subject || '(no subject)'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Expand all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {emails.map((email) => (
          <MessageBubble
            key={email.id}
            email={email}
            isExpanded={expandedIds.has(email.id)}
            onToggle={() => toggleExpanded(email.id)}
          />
        ))}
      </div>

      {lastEmail && (
        <QuickReply
          replyToEmail={lastEmail}
          threadId={threadId}
          onSent={refetch}
        />
      )}
    </div>
  );
}
