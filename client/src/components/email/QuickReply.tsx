import { useState, useCallback } from 'react';
import { useAddresses } from '@/hooks/useAddresses';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AttachmentPicker } from './AttachmentPicker';
import type { Email } from '@/types';

interface QuickReplyProps {
  replyToEmail: Email;
  threadId: string;
  onSent?: () => void;
}

export function QuickReply({ replyToEmail, threadId, onSent }: QuickReplyProps) {
  const { addresses } = useAddresses();
  const { send, sending, error, clearError } = useSendEmail();
  const {
    attachments: pendingAttachments,
    uploading,
    addFiles,
    removeAttachment,
    uploadAll,
    reset: resetAttachments,
  } = useAttachmentUpload();
  const [body, setBody] = useState('');
  const [fromAddressId, setFromAddressId] = useState(
    replyToEmail.email_address_id || addresses[0]?.id || ''
  );

  // Determine reply-to address based on direction
  const replyTo = (() => {
    if (replyToEmail.direction === 'outbound') {
      // If we sent the last email, reply to the person we sent it to
      return replyToEmail.to_addresses?.[0]?.email || replyToEmail.from_address;
    }
    // If we received the last email, reply to the sender
    return replyToEmail.reply_to || replyToEmail.from_address;
  })();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!fromAddressId || !body.trim()) return;

      // Upload attachments first if any
      const tempEmailId = crypto.randomUUID();
      let uploadedAttachments: Array<{
        storage_path: string;
        filename: string;
        content_type: string;
      }> = [];

      if (pendingAttachments.some((a) => a.status === 'pending')) {
        uploadedAttachments = await uploadAll(tempEmailId);
      }

      const result = await send({
        fromAddressId,
        to: [replyTo],
        subject: replyToEmail.subject?.startsWith('Re:')
          ? replyToEmail.subject
          : `Re: ${replyToEmail.subject || '(no subject)'}`,
        bodyText: body,
        inReplyTo: replyToEmail.message_id,
        threadId,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      if (result) {
        setBody('');
        resetAttachments();
        onSent?.();
      }
    },
    [fromAddressId, body, replyTo, replyToEmail, threadId, send, onSent, pendingAttachments, uploadAll, resetAttachments]
  );

  // Update fromAddressId when addresses load
  if (!fromAddressId && addresses.length > 0) {
    setFromAddressId(replyToEmail.email_address_id || addresses[0].id);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit}>
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-500">Reply as:</span>
          <select
            value={fromAddressId}
            onChange={(e) => setFromAddressId(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          >
            {addresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                {addr.display_name
                  ? `${addr.display_name} <${addr.local_part}@${addr.domain}>`
                  : `${addr.local_part}@${addr.domain}`}
              </option>
            ))}
          </select>
          <span className="text-gray-400">to</span>
          <span className="text-gray-700">{replyTo}</span>
        </div>

        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            clearError();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Write your reply... (Ctrl+Enter to send)"
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="mt-2">
          <AttachmentPicker
            attachments={pendingAttachments}
            onAddFiles={addFiles}
            onRemove={removeAttachment}
            disabled={sending || uploading}
          />
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={sending || uploading || !body.trim() || !fromAddressId}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending || uploading ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                {uploading ? 'Uploading...' : 'Sending...'}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send Reply
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
