import { useRef } from 'react';
import type { PendingAttachment } from '@/hooks/useAttachmentUpload';
import { formatFileSize } from '@/utils/formatters';

interface AttachmentPickerProps {
  attachments: PendingAttachment[];
  onAddFiles: (files: FileList) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function AttachmentPicker({
  attachments,
  onAddFiles,
  onRemove,
  disabled,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          Attach files
        </button>
        <span className="text-xs text-gray-400">Max 10 MB per file</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && onAddFiles(e.target.files)}
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
        />
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                attachment.status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : attachment.status === 'uploaded'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span className="max-w-[120px] truncate">{attachment.file.name}</span>
              <span className="text-gray-400">
                ({formatFileSize(attachment.file.size)})
              </span>
              {attachment.status === 'uploading' && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              )}
              {attachment.status === 'uploaded' && (
                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {attachment.status === 'error' && (
                <span title={attachment.error} className="cursor-help">
                  ⚠️
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                disabled={disabled || attachment.status === 'uploading'}
                className="ml-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
