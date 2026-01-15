import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const mailgunApiKey = process.env.MAILGUN_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

interface MailgunAttachment {
  url: string;
  'content-type': string;
  name: string;
  size: number;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

async function processAttachments(
  supabaseClient: SupabaseClient,
  attachmentsJson: string | undefined,
  userId: string,
  emailId: string
): Promise<void> {
  if (!attachmentsJson) return;

  let attachments: MailgunAttachment[];
  try {
    attachments = JSON.parse(attachmentsJson);
  } catch (e) {
    console.error('Failed to parse attachments JSON:', e);
    return;
  }

  for (const att of attachments) {
    try {
      // Skip attachments that are too large
      if (att.size > MAX_ATTACHMENT_SIZE) {
        console.log(`Skipping attachment "${att.name}" - exceeds 10MB limit (${att.size} bytes)`);
        continue;
      }

      // Download from Mailgun
      const response = await fetch(att.url, {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`api:${mailgunApiKey}`).toString('base64'),
        },
      });

      if (!response.ok) {
        console.error(`Failed to download attachment "${att.name}": ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Upload to Supabase Storage
      const storagePath = `${userId}/${emailId}/${crypto.randomUUID()}_${sanitizeFilename(att.name)}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('attachments')
        .upload(storagePath, buffer, {
          contentType: att['content-type'],
          upsert: false,
        });

      if (uploadError) {
        console.error(`Failed to upload attachment "${att.name}":`, uploadError);
        continue;
      }

      // Insert attachment record
      const { error: insertError } = await supabaseClient.from('attachments').insert({
        email_id: emailId,
        filename: att.name,
        content_type: att['content-type'],
        size_bytes: att.size,
        storage_path: storagePath,
        mailgun_url: att.url,
      });

      if (insertError) {
        console.error(`Failed to insert attachment record for "${att.name}":`, insertError);
        continue;
      }

      console.log(`Processed attachment: ${att.name} (${att.size} bytes)`);
    } catch (error) {
      console.error(`Error processing attachment "${att.name}":`, error);
    }
  }
}

function parseEmailAddress(address: string): { email: string; name?: string } {
  // Parse "Name <email@example.com>" format
  const match = address.match(/^(?:"?([^"<]*)"?\s)?<?([^>]+)>?$/);
  if (match) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2].trim().toLowerCase(),
    };
  }
  return { email: address.trim().toLowerCase() };
}

function extractLocalPart(email: string): string {
  return email.split('@')[0].toLowerCase();
}

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // Parse form data (Mailgun sends as application/x-www-form-urlencoded)
    const params = new URLSearchParams(event.body || '');
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });

    // Extract recipient info
    const recipient = payload.recipient?.toLowerCase();
    if (!recipient) {
      console.log('No recipient in payload');
      return { statusCode: 200, body: 'No recipient' };
    }

    const localPart = extractLocalPart(recipient);
    const domain = extractDomain(recipient);

    // Find the email address and its owner
    const { data: emailAddress, error: addressError } = await supabase
      .from('email_addresses')
      .select('id, user_id')
      .eq('local_part', localPart)
      .eq('domain', domain)
      .single();

    if (addressError || !emailAddress) {
      console.log(`Email address not found: ${recipient}`);
      // Return 200 to prevent Mailgun from retrying
      return { statusCode: 200, body: 'Address not found, ignoring' };
    }

    const userId = emailAddress.user_id;

    // Extract email headers
    const messageId = payload['Message-Id'] || `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@generated>`;
    const inReplyTo = payload['In-Reply-To'] || null;
    const references = payload['References'] || null;
    const subject = payload.subject || '(no subject)';

    // Find or create thread using the database function
    const { data: threadId, error: threadError } = await supabase.rpc('find_or_create_thread', {
      p_user_id: userId,
      p_message_id: messageId,
      p_in_reply_to: inReplyTo,
      p_references: references,
      p_subject: subject,
    });

    if (threadError) {
      console.error('Error finding/creating thread:', threadError);
      return { statusCode: 500, body: 'Thread error' };
    }

    // Parse from address
    const fromParsed = parseEmailAddress(payload.from || payload.sender || 'unknown@unknown.com');

    // Parse to addresses
    const toAddresses = payload.recipient
      ? [{ email: payload.recipient }]
      : [];

    // Insert the email
    const { data: insertedEmail, error: emailError } = await supabase
      .from('emails')
      .insert({
        user_id: userId,
        thread_id: threadId,
        email_address_id: emailAddress.id,
        direction: 'inbound',
        message_id: messageId,
        in_reply_to: inReplyTo,
        references_header: references,
        from_address: fromParsed.email,
        from_name: fromParsed.name,
        to_addresses: toAddresses,
        subject,
        body_text: payload['body-plain'] || null,
        body_html: payload['body-html'] || null,
        stripped_text: payload['stripped-text'] || null,
        received_at: payload.timestamp
          ? new Date(parseInt(payload.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
      })
      .select('id')
      .single();

    if (emailError || !insertedEmail) {
      console.error('Error inserting email:', emailError);
      return { statusCode: 500, body: 'Database error' };
    }

    // Process attachments if any
    await processAttachments(supabase, payload.attachments, userId, insertedEmail.id);

    console.log(`Email received for ${recipient} from ${fromParsed.email}`);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Webhook error:', error);
    return { statusCode: 500, body: 'Internal error' };
  }
};
