-- Add quote_approval_request to the notifications type constraint
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'project_created',
    'drawing_assigned',
    'drawing_approved',
    'item_ready_for_qc',
    'dispatch_scheduled',
    'quote_approval_request',
    'general'
  ));
