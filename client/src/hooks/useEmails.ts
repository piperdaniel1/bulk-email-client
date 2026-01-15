import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Email } from '@/types';

interface UseEmailsOptions {
  addressId?: string;
  threadId?: string;
  direction?: 'inbound' | 'outbound';
  limit?: number;
}

export function useEmails(options: UseEmailsOptions = {}) {
  const { addressId, threadId, direction, limit = 100 } = options;
  const { user } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    if (!user) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from('emails')
      .select(
        `
        *,
        email_address:email_addresses(id, local_part, domain, display_name),
        thread:threads(id, subject, message_count, last_message_at)
      `
      )
      .eq('user_id', user.id)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (addressId) {
      query = query.eq('email_address_id', addressId);
    }
    if (threadId) {
      query = query.eq('thread_id', threadId).order('received_at', { ascending: true });
    }
    if (direction) {
      query = query.eq('direction', direction);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setEmails([]);
    } else {
      setEmails(data || []);
    }
    setLoading(false);
  }, [user, addressId, threadId, direction, limit]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const markAsRead = useCallback(async (emailId: string) => {
    const { error: updateError } = await supabase
      .from('emails')
      .update({ read_at: new Date().toISOString() })
      .eq('id', emailId);

    if (updateError) throw updateError;

    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId ? { ...e, read_at: new Date().toISOString() } : e
      )
    );
  }, []);

  const markAllAsRead = useCallback(async (emailIds: string[]) => {
    const { error: updateError } = await supabase
      .from('emails')
      .update({ read_at: new Date().toISOString() })
      .in('id', emailIds);

    if (updateError) throw updateError;

    setEmails((prev) =>
      prev.map((e) =>
        emailIds.includes(e.id) ? { ...e, read_at: new Date().toISOString() } : e
      )
    );
  }, []);

  return {
    emails,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchEmails,
    setEmails,
  };
}
