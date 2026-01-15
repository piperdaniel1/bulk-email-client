import { useState } from 'react';
import type { Attachment } from '@/types';
import { useAttachments } from '@/hooks/useAttachments';
import { formatFileSize } from '@/utils/formatters';

interface AttachmentListProps {
  emailId: string;
}

function getFileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return '🖼️';
  if (contentType === 'application/pdf') return '📄';
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
  if (contentType.includes('document') || contentType.includes('word')) return '📝';
  if (contentType.includes('zip')) return '📦';
  if (contentType.startsWith('text/')) return '📃';
  return '📎';
}

export function AttachmentList({ emailId }: AttachmentListProps) {
  const { attachments, loading, getDownloadUrl } = useAttachments(emailId);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (loading || attachments.length === 0) return null;

  const handleDownload = async (attachment: Attachment) => {
    setDownloading(attachment.id);
    try {
      const url = await getDownloadUrl(attachment);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="mb-2 text-xs font-medium text-gray-500">
        Attachments ({attachments.length})
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <button
            key={attachment.id}
            onClick={() => handleDownload(attachment)}
            disabled={downloading === attachment.id}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            <span>{getFileIcon(attachment.content_type)}</span>
            <span className="max-w-[150px] truncate">{attachment.filename}</span>
            <span className="text-gray-400">
              ({formatFileSize(attachment.size_bytes)})
            </span>
            {downloading === attachment.id && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
