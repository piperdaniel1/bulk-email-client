-- Function to find or create thread for an incoming email
-- This is called from the webhook handler with service role
CREATE OR REPLACE FUNCTION find_or_create_thread(
  p_user_id UUID,
  p_message_id VARCHAR,
  p_in_reply_to VARCHAR,
  p_references TEXT,
  p_subject VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
  v_ref_array TEXT[];
  v_ref VARCHAR;
BEGIN
  -- First, check if this is a reply (has in_reply_to)
  IF p_in_reply_to IS NOT NULL AND p_in_reply_to != '' THEN
    SELECT thread_id INTO v_thread_id
    FROM emails
    WHERE message_id = p_in_reply_to
    AND user_id = p_user_id
    LIMIT 1;

    IF v_thread_id IS NOT NULL THEN
      RETURN v_thread_id;
    END IF;
  END IF;

  -- Check references header
  IF p_references IS NOT NULL AND p_references != '' THEN
    -- Split by spaces and check each reference
    v_ref_array := string_to_array(p_references, ' ');

    IF v_ref_array IS NOT NULL THEN
      FOREACH v_ref IN ARRAY v_ref_array LOOP
        IF v_ref IS NOT NULL AND v_ref != '' THEN
          SELECT thread_id INTO v_thread_id
          FROM emails
          WHERE message_id = v_ref
          AND user_id = p_user_id
          LIMIT 1;

          IF v_thread_id IS NOT NULL THEN
            RETURN v_thread_id;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- No existing thread found, create new one
  INSERT INTO threads (user_id, subject, root_message_id, last_message_at, message_count)
  VALUES (p_user_id, p_subject, p_message_id, NOW(), 0)
  RETURNING id INTO v_thread_id;

  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update thread metadata after new email
CREATE OR REPLACE FUNCTION update_thread_on_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE threads
    SET
      last_message_at = COALESCE(NEW.received_at, NOW()),
      message_count = message_count + 1
    WHERE id = NEW.thread_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update thread on new email
CREATE TRIGGER trigger_update_thread_on_email
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_email();

-- Function to decrement thread message count on email delete
CREATE OR REPLACE FUNCTION update_thread_on_email_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.thread_id IS NOT NULL THEN
    UPDATE threads
    SET message_count = GREATEST(0, message_count - 1)
    WHERE id = OLD.thread_id;

    -- Delete thread if no messages left
    DELETE FROM threads
    WHERE id = OLD.thread_id
    AND message_count = 0;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_thread_on_email_delete
  AFTER DELETE ON emails
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_email_delete();
