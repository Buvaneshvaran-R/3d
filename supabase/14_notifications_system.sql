-- =====================================================
-- NOTIFICATIONS SYSTEM FOR STUDENT REQUESTS & ADMIN RESPONSES
-- =====================================================

-- Drop existing table and policies if they exist
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
DROP FUNCTION IF EXISTS update_notifications_updated_at();
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES students(id) ON DELETE CASCADE,
    recipient_id UUID, -- Can be admin or student
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('admin', 'student')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    request_type VARCHAR(50), -- e.g., 'leave', 'od', 'general', 'feedback'
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    is_read BOOLEAN DEFAULT FALSE,
    parent_notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own notifications
CREATE POLICY "Students can view own notifications"
ON notifications FOR SELECT
USING (
  (recipient_type = 'student' AND EXISTS (
    SELECT 1 FROM students WHERE students.id = recipient_id AND students.user_id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1 FROM students WHERE students.id = sender_id AND students.user_id = auth.uid()
  ))
);

-- Policy: Admins can view all notifications where they are recipient
CREATE POLICY "Admins can view notifications"
ON notifications FOR SELECT
USING (
  recipient_type = 'admin' 
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
  )
);

-- Policy: Students can insert notifications to admin
CREATE POLICY "Students can send notifications to admin"
ON notifications FOR INSERT
WITH CHECK (
  recipient_type = 'admin' 
  AND EXISTS (
    SELECT 1 FROM students WHERE students.user_id = auth.uid() AND students.id = sender_id
  )
);

-- Policy: Admins can insert response notifications to students
CREATE POLICY "Admins can send responses to students"
ON notifications FOR INSERT
WITH CHECK (
  recipient_type = 'student' 
  AND EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
  )
);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (
  (recipient_type = 'student' AND EXISTS (
    SELECT 1 FROM students WHERE students.id = recipient_id AND students.user_id = auth.uid()
  ))
  OR 
  (recipient_type = 'admin' AND EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
  ))
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS notifications_updated_at ON notifications;
CREATE TRIGGER notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();
