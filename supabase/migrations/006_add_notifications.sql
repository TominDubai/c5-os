-- Notifications System for C5 OS
-- Tracks notifications sent to users for various events

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
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
  
  -- Related entities (for linking)
  entity_type TEXT, -- 'project', 'drawing_requirement', 'dispatch', etc.
  entity_id UUID,
  link_url TEXT, -- Direct link to relevant page
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Delivery
  delivered_via TEXT[], -- ['in_app', 'email', 'whatsapp']
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "Allow system insert" 
  ON notifications FOR INSERT 
  WITH CHECK (true);

-- View: Unread notification counts per user
CREATE VIEW v_unread_notifications AS
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM notifications
WHERE read = false
GROUP BY user_id;
