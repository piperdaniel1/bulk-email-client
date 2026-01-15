-- Create emails table
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  email_address_id UUID REFERENCES email_addresses(id) ON DELETE SET NULL,

  -- Direction
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Email headers for threading
  message_id VARCHAR(998) UNIQUE NOT NULL,
  in_reply_to VARCHAR(998),
  references_header TEXT,

  -- Addresses
  from_address VARCHAR(320) NOT NULL,
  from_name VARCHAR(255),
  to_addresses JSONB NOT NULL DEFAULT '[]',
  cc_addresses JSONB,
  bcc_addresses JSONB,
  reply_to VARCHAR(320),

  -- Content
  subject VARCHAR(998),
  body_text TEXT,
  body_html TEXT,
  stripped_text TEXT,

  -- Metadata
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  mailgun_message_id VARCHAR(255),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_email_address_id ON emails(email_address_id);
CREATE INDEX idx_emails_message_id ON emails(message_id);
CREATE INDEX idx_emails_in_reply_to ON emails(in_reply_to);
CREATE INDEX idx_emails_received_at ON emails(user_id, received_at DESC);
CREATE INDEX idx_emails_direction ON emails(user_id, direction);
CREATE INDEX idx_emails_unread ON emails(user_id, direction, read_at) WHERE read_at IS NULL;
