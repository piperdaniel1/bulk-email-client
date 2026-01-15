-- Enable Row Level Security on all tables
ALTER TABLE email_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- email_addresses policies
CREATE POLICY "Users can view own email addresses"
  ON email_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own email addresses"
  ON email_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email addresses"
  ON email_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email addresses"
  ON email_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- threads policies
CREATE POLICY "Users can view own threads"
  ON threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
  ON threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads"
  ON threads FOR DELETE
  USING (auth.uid() = user_id);

-- emails policies
CREATE POLICY "Users can view own emails"
  ON emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own emails"
  ON emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails"
  ON emails FOR DELETE
  USING (auth.uid() = user_id);

-- attachments policies (based on email ownership)
CREATE POLICY "Users can view attachments of own emails"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = attachments.email_id
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attachments for own emails"
  ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = attachments.email_id
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of own emails"
  ON attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = attachments.email_id
      AND emails.user_id = auth.uid()
    )
  );
