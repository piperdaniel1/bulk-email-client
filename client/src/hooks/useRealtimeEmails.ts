import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Email } from '@/types';

interface UseRealtimeEmailsOptions {
  addressId?: string;
  onNewEmail?: (email: Email) => void;
  onEmailUpdate?: (email: Email) => void;
  enabled?: boolean;
}

export function useRealtimeEmails(options: UseRealtimeEmailsOptions = {}) {
  const { addressId, onNewEmail, onEmailUpdate, enabled = true } = options;
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchFullEmail = useCallback(async (emailId: string): Promise<Email | null> => {
    const { data, error } = await supabase
      .from('emails')
      .select(
        `
        *,
        email_address:email_addresses(id, local_part, domain, display_name),
        thread:threads(id, subject, message_count, last_message_at)
      `
      )
      .eq('id', emailId)
      .single();

    if (error) {
      console.error('Error fetching email:', error);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    if (!enabled || !user) return;

    const channelName = addressId
      ? `emails-realtime-${addressId}`
      : 'emails-realtime-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails',
          ...(addressId && { filter: `email_address_id=eq.${addressId}` }),
        },
        async (payload) => {
          // Fetch the full email with relations
          const fullEmail = await fetchFullEmail(payload.new.id);
          if (fullEmail && onNewEmail) {
            onNewEmail(fullEmail);

            // Browser notification
            if (Notification.permission === 'granted' && fullEmail.direction === 'inbound') {
              new Notification('New Email', {
                body: `From: ${fullEmail.from_name || fullEmail.from_address}\n${fullEmail.subject || '(no subject)'}`,
                icon: '/favicon.svg',
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emails',
          ...(addressId && { filter: `email_address_id=eq.${addressId}` }),
        },
        async (payload) => {
          const fullEmail = await fetchFullEmail(payload.new.id);
          if (fullEmail && onEmailUpdate) {
            onEmailUpdate(fullEmail);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, user, addressId, onNewEmail, onEmailUpdate, fetchFullEmail]);

  return {
    requestNotificationPermission: useCallback(async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }, []),
  };
}
