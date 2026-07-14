-- Migration 009: Create chat_sessions and chat_messages tables

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT,                    -- Auto-generated from first message
  language    TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'si', 'ta')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id   ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated   ON chat_sessions (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session   ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created   ON chat_messages (created_at ASC);

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
