import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const mailgunApiKey = process.env.MAILGUN_API_KEY!;
const mailgunDomain = process.env.MAILGUN_DOMAIN || 'setdomain.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SendEmailRequest {
  from_address_id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  in_reply_to?: string;
  thread_id?: string;
}

function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}.${random}@${domain}>`;
}

async function sendViaMailgun(params: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ id: string }> {
  const formData = new URLSearchParams();
  formData.append('from', params.from);
  params.to.forEach((addr) => formData.append('to', addr));
  params.cc?.forEach((addr) => formData.append('cc', addr));
  params.bcc?.forEach((addr) => formData.append('bcc', addr));
  formData.append('subject', params.subject);
  if (params.text) formData.append('text', params.text);
  if (params.html) formData.append('html', params.html);
  formData.append('h:Message-Id', params.messageId);
  if (params.inReplyTo) formData.append('h:In-Reply-To', params.inReplyTo);
  if (params.references) formData.append('h:References', params.references);

  const response = await fetch(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${mailgunApiKey}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun error: ${error}`);
  }

  const result = await response.json();
  return { id: result.id };
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify auth token
  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Create a client with the user's token to verify auth
  const userSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey);
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);

  if (authError || !user) {
    return { statusCode: 401, body: 'Invalid token' };
  }

  try {
    const request: SendEmailRequest = JSON.parse(event.body || '{}');

    if (!request.from_address_id || !request.to?.length || !request.subject) {
      return { statusCode: 400, body: 'Missing required fields' };
    }

    // Verify user owns the from address (using service role for reliability)
    const { data: fromAddress, error: addressError } = await supabase
      .from('email_addresses')
      .select('*')
      .eq('id', request.from_address_id)
      .eq('user_id', user.id)
      .single();

    if (addressError || !fromAddress) {
      return { statusCode: 403, body: 'Invalid from address' };
    }

    const fromEmail = `${fromAddress.local_part}@${fromAddress.domain}`;
    const fromFormatted = fromAddress.display_name
      ? `${fromAddress.display_name} <${fromEmail}>`
      : fromEmail;

    const messageId = generateMessageId(fromAddress.domain);

    // Build references header for threading
    let references = '';
    if (request.in_reply_to) {
      const { data: replyToEmail } = await supabase
        .from('emails')
        .select('references_header, message_id')
        .eq('message_id', request.in_reply_to)
        .single();

      if (replyToEmail) {
        const existingRefs = replyToEmail.references_header || '';
        references = existingRefs
          ? `${existingRefs} ${replyToEmail.message_id}`
          : replyToEmail.message_id;
      }
    }

    // Send via Mailgun
    const mailgunResponse = await sendViaMailgun({
      from: fromFormatted,
      to: request.to,
      cc: request.cc,
      bcc: request.bcc,
      subject: request.subject,
      text: request.body_text,
      html: request.body_html,
      messageId,
      inReplyTo: request.in_reply_to,
      references: references || undefined,
    });

    // Determine thread
    let threadId = request.thread_id;
    if (!threadId && request.in_reply_to) {
      const { data: parentEmail } = await supabase
        .from('emails')
        .select('thread_id')
        .eq('message_id', request.in_reply_to)
        .single();
      threadId = parentEmail?.thread_id;
    }

    if (!threadId) {
      // Create new thread
      const { data: newThread } = await supabase
        .from('threads')
        .insert({
          user_id: user.id,
          subject: request.subject,
          root_message_id: messageId,
          message_count: 0,
        })
        .select()
        .single();
      threadId = newThread?.id;
    }

    // Save sent email to database
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        thread_id: threadId,
        email_address_id: fromAddress.id,
        direction: 'outbound',
        message_id: messageId,
        in_reply_to: request.in_reply_to || null,
        references_header: references || null,
        from_address: fromEmail,
        from_name: fromAddress.display_name,
        to_addresses: request.to.map((email) => ({ email })),
        cc_addresses: request.cc?.map((email) => ({ email })) || null,
        bcc_addresses: request.bcc?.map((email) => ({ email })) || null,
        subject: request.subject,
        body_text: request.body_text || null,
        body_html: request.body_html || null,
        mailgun_message_id: mailgunResponse.id,
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error saving sent email:', emailError);
      // Email was sent, just couldn't save - still return success
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        email_id: email?.id,
        message_id: messageId,
      }),
    };
  } catch (error) {
    console.error('Send email error:', error);
    return {
      statusCode: 500,
      body: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};
