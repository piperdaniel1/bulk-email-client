import { useState, useCallback } from 'react';
import { sendEmail } from '@/lib/api';

interface SendEmailParams {
  fromAddressId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  threadId?: string;
  attachments?: Array<{
    storage_path: string;
    filename: string;
    content_type: string;
  }>;
}

export function useSendEmail() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (params: SendEmailParams) => {
    setSending(true);
    setError(null);

    try {
      const result = await sendEmail(params);

      if (!result.success) {
        setError(result.error || 'Failed to send email');
        return null;
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      setError(message);
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending, error, clearError: () => setError(null) };
}
