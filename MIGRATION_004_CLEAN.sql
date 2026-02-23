-- Migration 004: Notifications System

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN (
    'project_created',
    'drawing_assigned',
    'drawing_approved',
    'item_ready_for_qc',
    'dispatch_scheduled',
    'general'
  )),
  entity_type TEXT,
  entity_id UUID,
  link_url TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered_via TEXT[],
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE VIEW v_unread_notifications AS
SELECT user_id, COUNT(*) as unread_count
FROM notifications
WHERE read = false
GROUP BY user_id;
