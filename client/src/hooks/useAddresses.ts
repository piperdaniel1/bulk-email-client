import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { DEFAULT_DOMAIN } from '@/utils/constants';
import type { EmailAddress } from '@/types';

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('email_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setAddresses([]);
    } else {
      setAddresses(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Real-time subscription for address changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('email_addresses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_addresses',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime payload received:', payload);
          if (payload.eventType === 'INSERT') {
            setAddresses((prev) => [payload.new as EmailAddress, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setAddresses((prev) =>
              prev.filter((a) => a.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            setAddresses((prev) =>
              prev.map((a) =>
                a.id === payload.new.id ? (payload.new as EmailAddress) : a
              )
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime subscription status:', status, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createAddress = useCallback(
    async (localPart: string, displayName?: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error: createError } = await supabase
        .from('email_addresses')
        .insert({
          user_id: user.id,
          local_part: localPart.toLowerCase().trim(),
          domain: DEFAULT_DOMAIN,
          display_name: displayName?.trim() || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Immediately update local state
      setAddresses((prev) => [data as EmailAddress, ...prev]);

      return data as EmailAddress;
    },
    [user]
  );

  const deleteAddress = useCallback(async (addressId: string) => {
    const { error: deleteError } = await supabase
      .from('email_addresses')
      .delete()
      .eq('id', addressId);

    if (deleteError) throw deleteError;

    // Immediately update local state
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
  }, []);

  const updateAddress = useCallback(
    async (addressId: string, updates: { display_name?: string }) => {
      const { data, error: updateError } = await supabase
        .from('email_addresses')
        .update(updates)
        .eq('id', addressId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as EmailAddress;
    },
    []
  );

  return {
    addresses,
    loading,
    error,
    createAddress,
    deleteAddress,
    updateAddress,
    refetch: fetchAddresses,
  };
}
