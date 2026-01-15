import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { AddressFolder } from '@/types';

interface FoldersContextType {
  folders: AddressFolder[];
  loading: boolean;
  error: string | null;
  createFolder: (name: string) => Promise<AddressFolder>;
  updateFolder: (folderId: string, updates: { name?: string; sort_order?: number }) => Promise<AddressFolder>;
  deleteFolder: (folderId: string) => Promise<void>;
  reorderFolders: (folderId: string, newSortOrder: number) => Promise<void>;
  refetch: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextType | null>(null);

export function FoldersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<AddressFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('address_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setFolders([]);
    } else {
      setFolders(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Real-time subscription for folder changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('address_folders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'address_folders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFolders((prev) => {
              if (prev.some(f => f.id === (payload.new as AddressFolder).id)) {
                return prev;
              }
              return [...prev, payload.new as AddressFolder].sort((a, b) => a.sort_order - b.sort_order);
            });
          } else if (payload.eventType === 'DELETE') {
            setFolders((prev) => prev.filter((f) => f.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setFolders((prev) =>
              prev
                .map((f) => f.id === payload.new.id ? (payload.new as AddressFolder) : f)
                .sort((a, b) => a.sort_order - b.sort_order)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createFolder = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get max sort_order
      const maxOrder = folders.reduce((max, f) => Math.max(max, f.sort_order), -1);

      const { data, error: createError } = await supabase
        .from('address_folders')
        .insert({
          user_id: user.id,
          name: name.trim(),
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (createError) throw createError;
      return data as AddressFolder;
    },
    [user, folders]
  );

  const updateFolder = useCallback(
    async (folderId: string, updates: { name?: string; sort_order?: number }) => {
      const { data, error: updateError } = await supabase
        .from('address_folders')
        .update(updates)
        .eq('id', folderId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as AddressFolder;
    },
    []
  );

  const deleteFolder = useCallback(async (folderId: string) => {
    const { error: deleteError } = await supabase
      .from('address_folders')
      .delete()
      .eq('id', folderId);

    if (deleteError) throw deleteError;
  }, []);

  const reorderFolders = useCallback(
    async (folderId: string, newSortOrder: number) => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const oldSortOrder = folder.sort_order;
      if (oldSortOrder === newSortOrder) return;

      // Update sort orders for affected folders
      const updates: PromiseLike<unknown>[] = [];

      if (newSortOrder > oldSortOrder) {
        // Moving down: decrement items between old and new position
        folders.forEach(f => {
          if (f.sort_order > oldSortOrder && f.sort_order <= newSortOrder) {
            updates.push(
              supabase
                .from('address_folders')
                .update({ sort_order: f.sort_order - 1 })
                .eq('id', f.id)
                .then()
            );
          }
        });
      } else {
        // Moving up: increment items between new and old position
        folders.forEach(f => {
          if (f.sort_order >= newSortOrder && f.sort_order < oldSortOrder) {
            updates.push(
              supabase
                .from('address_folders')
                .update({ sort_order: f.sort_order + 1 })
                .eq('id', f.id)
                .then()
            );
          }
        });
      }

      // Update the moved folder
      updates.push(
        supabase
          .from('address_folders')
          .update({ sort_order: newSortOrder })
          .eq('id', folderId)
          .then()
      );

      await Promise.all(updates);
      await fetchFolders();
    },
    [folders, fetchFolders]
  );

  return (
    <FoldersContext.Provider
      value={{
        folders,
        loading,
        error,
        createFolder,
        updateFolder,
        deleteFolder,
        reorderFolders,
        refetch: fetchFolders,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error('useFolders must be used within FoldersProvider');
  }
  return context;
}
