-- Migration: Address Folders with Cascade Delete
-- This adds folder organization for email addresses and changes delete behavior

-- 1. Create address_folders table
CREATE TABLE address_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_address_folders_user_id ON address_folders(user_id);
CREATE INDEX idx_address_folders_sort ON address_folders(user_id, sort_order);

-- 2. Add folder_id and sort_order to email_addresses
-- CASCADE: deleting a folder deletes all addresses inside
ALTER TABLE email_addresses
ADD COLUMN folder_id UUID REFERENCES address_folders(id) ON DELETE CASCADE,
ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_email_addresses_folder_id ON email_addresses(folder_id);
CREATE INDEX idx_email_addresses_sort ON email_addresses(user_id, folder_id, sort_order);

-- 3. Change emails.email_address_id from SET NULL to CASCADE
-- This ensures deleting an address also deletes all associated emails
ALTER TABLE emails DROP CONSTRAINT emails_email_address_id_fkey;
ALTER TABLE emails ADD CONSTRAINT emails_email_address_id_fkey
  FOREIGN KEY (email_address_id) REFERENCES email_addresses(id) ON DELETE CASCADE;

-- 4. RLS policies for address_folders
ALTER TABLE address_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON address_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON address_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON address_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON address_folders
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Enable realtime for address_folders
ALTER PUBLICATION supabase_realtime ADD TABLE address_folders;
