import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Thread, Email } from '@/types';

interface ThreadWithLatestEmail extends Thread {
  latest_email?: Email;
  unread_count: number;
}

interface UseThreadsOptions {
  addressId?: string;
  limit?: number;
}

export function useThreads(options: UseThreadsOptions = {}) {
  const { addressId, limit = 50 } = options;
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadWithLatestEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // First, get threads
    const threadsQuery = supabase
      .from('threads')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    const { data: threadsData, error: threadsError } = await threadsQuery;

    if (threadsError) {
      setError(threadsError.message);
      setThreads([]);
      setLoading(false);
      return;
    }

    if (!threadsData || threadsData.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    // Get the latest email and unread count for each thread
    const threadIds = threadsData.map((t) => t.id);

    // Get latest email per thread using a raw query approach
    // We'll fetch all emails for these threads and process client-side
    let emailsQuery = supabase
      .from('emails')
      .select(
        `
        *,
        email_address:email_addresses(id, local_part, domain, display_name)
      `
      )
      .in('thread_id', threadIds)
      .order('received_at', { ascending: false });

    if (addressId) {
      emailsQuery = emailsQuery.eq('email_address_id', addressId);
    }

    const { data: emailsData } = await emailsQuery;

    // Process to get latest email and unread count per thread
    const threadMap = new Map<string, ThreadWithLatestEmail>();

    for (const thread of threadsData) {
      threadMap.set(thread.id, {
        ...thread,
        unread_count: 0,
      });
    }

    if (emailsData) {
      const seenThreads = new Set<string>();

      for (const email of emailsData) {
        if (!email.thread_id) continue;

        const thread = threadMap.get(email.thread_id);
        if (!thread) continue;

        // Set latest email (first one we see due to ordering)
        if (!seenThreads.has(email.thread_id)) {
          thread.latest_email = email;
          seenThreads.add(email.thread_id);
        }

        // Count unread
        if (!email.read_at && email.direction === 'inbound') {
          thread.unread_count++;
        }
      }
    }

    // Filter out threads with no emails if filtering by address
    let result = Array.from(threadMap.values());
    if (addressId) {
      result = result.filter((t) => t.latest_email);
    }

    // Sort by last_message_at
    result.sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    setThreads(result);
    setLoading(false);
  }, [user, addressId, limit]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Real-time subscription for thread updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('threads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any thread change
          fetchThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails',
        },
        () => {
          // Refetch when new emails arrive to update unread counts
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchThreads]);

  return {
    threads,
    loading,
    error,
    refetch: fetchThreads,
  };
}
