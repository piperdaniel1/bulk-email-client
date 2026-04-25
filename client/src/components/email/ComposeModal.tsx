import { useState, useCallback, useEffect } from 'react';
import { useAddresses } from '@/hooks/useAddresses';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AttachmentPicker } from './AttachmentPicker';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    email: string;
    subject: string;
    messageId: string;
    threadId: string;
  };
}

export function ComposeModal({ isOpen, onClose, replyTo }: ComposeModalProps) {
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

  const [fromAddressId, setFromAddressId] = useState(addresses[0]?.id || '');
  const [to, setTo] = useState(replyTo?.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`) : ''
  );
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!fromAddressId || !to.trim() || !subject.trim()) return;

      const toAddresses = to.split(',').map((e) => e.trim()).filter(Boolean);
      const ccAddresses = cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : undefined;

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
        to: toAddresses,
        cc: ccAddresses,
        subject,
        bodyText: body,
        inReplyTo: replyTo?.messageId,
        threadId: replyTo?.threadId,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      if (result) {
        // Reset form
        setTo('');
        setCc('');
        setSubject('');
        setBody('');
        resetAttachments();
        onClose();
      }
    },
    [fromAddressId, to, cc, subject, body, replyTo, send, onClose, pendingAttachments, uploadAll, resetAttachments]
  );

  const handleClose = useCallback(() => {
    clearError();
    resetAttachments();
    onClose();
  }, [clearError, resetAttachments, onClose]);

  // ESC to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Update fromAddressId when addresses load
  if (!fromAddressId && addresses.length > 0) {
    setFromAddressId(addresses[0].id);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="flex w-full max-w-2xl flex-col bg-white shadow-xl sm:max-h-[90vh] sm:rounded-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyTo ? 'Reply' : 'New Email'}
          </h2>
          <button
            onClick={handleClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="w-12 shrink-0 text-sm text-gray-500 sm:w-16">From:</label>
              <select
                value={fromAddressId}
                onChange={(e) => setFromAddressId(e.target.value)}
                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.display_name
                      ? `${addr.display_name} <${addr.local_part}@${addr.domain}>`
                      : `${addr.local_part}@${addr.domain}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="w-12 shrink-0 text-sm text-gray-500 sm:w-16">To:</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Cc
                </button>
              )}
            </div>

            {showCc && (
              <div className="flex items-center gap-2">
                <label className="w-12 shrink-0 text-sm text-gray-500 sm:w-16">Cc:</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="w-12 shrink-0 text-sm text-gray-500 sm:w-16">Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
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
              placeholder="Write your message... (Ctrl+Enter to send)"
              rows={8}
              className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            <AttachmentPicker
              attachments={pendingAttachments}
              onAddFiles={addFiles}
              onRemove={removeAttachment}
              disabled={sending || uploading}
            />
          </div>

          {error && (
            <div className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || uploading || !fromAddressId || !to.trim() || !subject.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
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
                  Send
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
