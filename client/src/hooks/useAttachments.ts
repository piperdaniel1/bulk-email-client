import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Attachment } from '@/types';

export function useAttachments(emailId: string | undefined) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!emailId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('email_id', emailId);

    if (!error && data) {
      setAttachments(data);
    }
    setLoading(false);
  }, [emailId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const getDownloadUrl = useCallback(
    async (attachment: Attachment): Promise<string | null> => {
      if (!attachment.storage_path) return null;

      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Failed to get download URL:', error);
        return null;
      }
      return data.signedUrl;
    },
    []
  );

  return { attachments, loading, getDownloadUrl, refetch: fetchAttachments };
}
