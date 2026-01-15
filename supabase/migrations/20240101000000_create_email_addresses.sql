-- Create email_addresses table
CREATE TABLE email_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_part VARCHAR(64) NOT NULL,
  domain VARCHAR(255) NOT NULL DEFAULT 'setdomain.com',
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_addresses_unique_email UNIQUE(local_part, domain)
);

-- Indexes
CREATE INDEX idx_email_addresses_user_id ON email_addresses(user_id);
CREATE INDEX idx_email_addresses_full ON email_addresses(local_part, domain);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_addresses_updated_at
  BEFORE UPDATE ON email_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
