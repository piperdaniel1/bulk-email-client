import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

export interface PendingAttachment {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  storagePath?: string;
  error?: string;
}

export function useAttachmentUpload() {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds 10 MB limit`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not allowed`;
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newAttachments: PendingAttachment[] = [];
      for (const file of Array.from(files)) {
        const error = validateFile(file);
        newAttachments.push({
          id: crypto.randomUUID(),
          file,
          status: error ? 'error' : 'pending',
          progress: 0,
          error: error || undefined,
        });
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
    },
    [validateFile]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const uploadAll = useCallback(
    async (
      tempEmailId: string
    ): Promise<
      Array<{ storage_path: string; filename: string; content_type: string }>
    > => {
      if (!user) throw new Error('Not authenticated');

      setUploading(true);
      const uploaded: Array<{
        storage_path: string;
        filename: string;
        content_type: string;
      }> = [];

      for (const attachment of attachments) {
        if (attachment.status === 'error') {
          continue;
        }

        try {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id ? { ...a, status: 'uploading' as const } : a
            )
          );

          const sanitizedName = attachment.file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 200);
          const storagePath = `${user.id}/${tempEmailId}/${attachment.id}_${sanitizedName}`;

          const { error } = await supabase.storage
            .from('attachments')
            .upload(storagePath, attachment.file, {
              contentType: attachment.file.type,
              upsert: false,
            });

          if (error) throw error;

          uploaded.push({
            storage_path: storagePath,
            filename: attachment.file.name,
            content_type: attachment.file.type,
          });

          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id
                ? { ...a, status: 'uploaded' as const, progress: 100, storagePath }
                : a
            )
          );
        } catch (err) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id
                ? {
                    ...a,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : a
            )
          );
        }
      }

      setUploading(false);
      return uploaded;
    },
    [user, attachments]
  );

  const reset = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    uploading,
    addFiles,
    removeAttachment,
    uploadAll,
    reset,
    hasValidAttachments: attachments.some((a) => a.status !== 'error'),
  };
}
