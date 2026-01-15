import { supabase } from './supabase';

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
}

interface SendEmailResponse {
  success: boolean;
  email_id?: string;
  message_id?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      from_address_id: params.fromAddressId,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      body_text: params.bodyText,
      body_html: params.bodyHtml,
      in_reply_to: params.inReplyTo,
      thread_id: params.threadId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: text };
  }

  return response.json();
}
