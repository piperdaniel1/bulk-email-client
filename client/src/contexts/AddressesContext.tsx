import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_DOMAIN } from '@/utils/constants';
import type { EmailAddress } from '@/types';

interface AddressesContextType {
  addresses: EmailAddress[];
  loading: boolean;
  error: string | null;
  createAddress: (localPart: string, displayName?: string, folderId?: string) => Promise<EmailAddress>;
  deleteAddress: (addressId: string) => Promise<void>;
  updateAddress: (addressId: string, updates: { display_name?: string; folder_id?: string | null; sort_order?: number }) => Promise<EmailAddress>;
  moveToFolder: (addressId: string, folderId: string | null) => Promise<void>;
  reorderAddress: (addressId: string, newSortOrder: number, folderId: string | null) => Promise<void>;
  refetch: () => Promise<void>;
  getAddressesByFolder: (folderId: string | null) => EmailAddress[];
}

const AddressesContext = createContext<AddressesContextType | null>(null);

export function AddressesProvider({ children }: { children: ReactNode }) {
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
      .order('folder_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true });

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
      .channel('email_addresses_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_addresses',
          // No filter - DELETE events can't be filtered with RLS enabled
          // (only primary key is sent). Unmatched IDs are harmlessly ignored.
        },
        (payload) => {
          console.log('[Addresses Realtime]', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const newAddr = payload.new as EmailAddress;
            // Filter client-side since we removed server filter for DELETE events
            if (newAddr.user_id !== user.id) return;
            setAddresses((prev) => {
              if (prev.some(a => a.id === newAddr.id)) return prev;
              return [newAddr, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            // Only has id, but unmatched IDs are harmlessly ignored
            setAddresses((prev) =>
              prev.filter((a) => a.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as EmailAddress;
            if (updated.user_id !== user.id) return;
            setAddresses((prev) =>
              prev.map((a) => a.id === updated.id ? updated : a)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getAddressesByFolder = useCallback(
    (folderId: string | null) => {
      return addresses.filter(a => a.folder_id === folderId);
    },
    [addresses]
  );

  const createAddress = useCallback(
    async (localPart: string, displayName?: string, folderId?: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get max sort_order for the target folder
      const folderAddresses = addresses.filter(a => a.folder_id === (folderId || null));
      const maxOrder = folderAddresses.reduce((max, a) => Math.max(max, a.sort_order), -1);

      const { data, error: createError } = await supabase
        .from('email_addresses')
        .insert({
          user_id: user.id,
          local_part: localPart.toLowerCase().trim(),
          domain: DEFAULT_DOMAIN,
          display_name: displayName?.trim() || null,
          folder_id: folderId || null,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (createError) throw createError;
      return data as EmailAddress;
    },
    [user, addresses]
  );

  const deleteAddress = useCallback(async (addressId: string) => {
    const { error: deleteError } = await supabase
      .from('email_addresses')
      .delete()
      .eq('id', addressId);

    if (deleteError) throw deleteError;

    // Optimistically remove from state (don't wait for realtime)
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
  }, []);

  const updateAddress = useCallback(
    async (addressId: string, updates: { display_name?: string; folder_id?: string | null; sort_order?: number }) => {
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

  const moveToFolder = useCallback(
    async (addressId: string, folderId: string | null) => {
      // Get max sort_order in target folder
      const targetAddresses = addresses.filter(a => a.folder_id === folderId);
      const maxOrder = targetAddresses.reduce((max, a) => Math.max(max, a.sort_order), -1);

      const { error: updateError } = await supabase
        .from('email_addresses')
        .update({ folder_id: folderId, sort_order: maxOrder + 1 })
        .eq('id', addressId);

      if (updateError) throw updateError;
    },
    [addresses]
  );

  const reorderAddress = useCallback(
    async (addressId: string, newSortOrder: number, folderId: string | null) => {
      const address = addresses.find(a => a.id === addressId);
      if (!address) return;

      const folderAddresses = addresses.filter(a => a.folder_id === folderId);
      const oldSortOrder = address.sort_order;
      const isChangingFolder = address.folder_id !== folderId;

      if (!isChangingFolder && oldSortOrder === newSortOrder) return;

      const updates: PromiseLike<unknown>[] = [];

      if (isChangingFolder) {
        // Moving to a different folder - just append at new position
        // Shift items at or after new position in target folder
        folderAddresses.forEach(a => {
          if (a.sort_order >= newSortOrder) {
            updates.push(
              supabase
                .from('email_addresses')
                .update({ sort_order: a.sort_order + 1 })
                .eq('id', a.id)
                .then()
            );
          }
        });
      } else {
        // Reordering within same folder
        if (newSortOrder > oldSortOrder) {
          folderAddresses.forEach(a => {
            if (a.sort_order > oldSortOrder && a.sort_order <= newSortOrder) {
              updates.push(
                supabase
                  .from('email_addresses')
                  .update({ sort_order: a.sort_order - 1 })
                  .eq('id', a.id)
                  .then()
              );
            }
          });
        } else {
          folderAddresses.forEach(a => {
            if (a.sort_order >= newSortOrder && a.sort_order < oldSortOrder) {
              updates.push(
                supabase
                  .from('email_addresses')
                  .update({ sort_order: a.sort_order + 1 })
                  .eq('id', a.id)
                  .then()
              );
            }
          });
        }
      }

      // Update the moved address
      updates.push(
        supabase
          .from('email_addresses')
          .update({ folder_id: folderId, sort_order: newSortOrder })
          .eq('id', addressId)
          .then()
      );

      await Promise.all(updates);
      await fetchAddresses();
    },
    [addresses, fetchAddresses]
  );

  return (
    <AddressesContext.Provider
      value={{
        addresses,
        loading,
        error,
        createAddress,
        deleteAddress,
        updateAddress,
        moveToFolder,
        reorderAddress,
        refetch: fetchAddresses,
        getAddressesByFolder,
      }}
    >
      {children}
    </AddressesContext.Provider>
  );
}

export function useAddresses() {
  const context = useContext(AddressesContext);
  if (!context) {
    throw new Error('useAddresses must be used within AddressesProvider');
  }
  return context;
}
