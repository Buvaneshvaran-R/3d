-- Create academic calendar table
CREATE TABLE IF NOT EXISTS academic_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_name VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  date_number INTEGER NOT NULL,
  start_day INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('working', 'holiday', 'weekend', 'reopening', 'ccm', 'gc', 'cat', 'club', 'feedback', 'lwd', 'practical', 'theory')),
  event_name VARCHAR(200),
  cumulative_days INTEGER DEFAULT 0,
  assignment VARCHAR(200),
  unit VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(month_name, year, date_number)
);

-- Create index for faster queries
CREATE INDEX idx_academic_calendar_month_year ON academic_calendar(month_name, year);
CREATE INDEX idx_academic_calendar_date ON academic_calendar(year, month_name, date_number);

-- Enable RLS
ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read calendar
CREATE POLICY "Everyone can view calendar"
  ON academic_calendar
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete calendar
CREATE POLICY "Only admins can insert calendar"
  ON academic_calendar
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update calendar"
  ON academic_calendar
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete calendar"
  ON academic_calendar
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_academic_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
CREATE TRIGGER academic_calendar_updated_at
  BEFORE UPDATE ON academic_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_academic_calendar_updated_at();

-- Enable realtime for academic_calendar
ALTER PUBLICATION supabase_realtime ADD TABLE academic_calendar;
