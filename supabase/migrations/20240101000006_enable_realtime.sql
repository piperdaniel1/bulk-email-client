-- Enable realtime for key tables
-- Note: This adds the tables to the supabase_realtime publication
-- which is required for Supabase Realtime to work

ALTER PUBLICATION supabase_realtime ADD TABLE emails;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE email_addresses;
