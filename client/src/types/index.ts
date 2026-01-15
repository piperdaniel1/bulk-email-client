export interface EmailAddress {
  id: string;
  user_id: string;
  local_part: string;
  domain: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Thread {
  id: string;
  user_id: string;
  subject: string | null;
  root_message_id: string | null;
  last_message_at: string;
  message_count: number;
  created_at: string;
}

export interface Email {
  id: string;
  user_id: string;
  thread_id: string | null;
  email_address_id: string | null;
  direction: 'inbound' | 'outbound';
  message_id: string;
  in_reply_to: string | null;
  references_header: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: EmailRecipient[];
  cc_addresses: EmailRecipient[] | null;
  bcc_addresses: EmailRecipient[] | null;
  reply_to: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  stripped_text: string | null;
  received_at: string;
  read_at: string | null;
  mailgun_message_id: string | null;
  created_at: string;
  // Joined relations
  email_address?: EmailAddress;
  thread?: Thread;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface Attachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_path: string | null;
  mailgun_url: string | null;
  created_at: string;
}

export interface ThreadWithEmails extends Thread {
  emails: Email[];
}
