-- Campus Management Tables for RIT Portal

-- Staff table (if not already exists)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  department VARCHAR(100),
  designation VARCHAR(100),
  qualification VARCHAR(255),
  joining_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Staff Assignments to Rooms/Offices
CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  building_id VARCHAR(10) NOT NULL,
  floor_number INTEGER NOT NULL,
  room_id VARCHAR(50) NOT NULL,
  assignment_type VARCHAR(50) DEFAULT 'primary', -- primary, secondary
  assignment_date DATE DEFAULT NOW(),
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(staff_id, building_id, floor_number, room_id, is_active)
);

-- Classroom Bookings
CREATE TABLE IF NOT EXISTS classroom_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id VARCHAR(50) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  purpose VARCHAR(500),
  notes TEXT,
  booking_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CHECK (end_time > start_time),
  INDEX idx_room_time (room_id, start_time, end_time),
  INDEX idx_staff_booking (staff_id, start_time)
);

-- Room Occupancy Log
CREATE TABLE IF NOT EXISTS room_occupancy_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  occupancy_status VARCHAR(50) NOT NULL, -- empty, occupied, maintenance
  occupied_by UUID REFERENCES auth.users(id),
  check_in_time TIMESTAMP DEFAULT NOW(),
  check_out_time TIMESTAMP,
  reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_room_status (room_id, created_at)
);

-- Campus Notifications
CREATE TABLE IF NOT EXISTS campus_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50), -- booking_confirmed, room_unavailable, etc
  related_room_id VARCHAR(50),
  related_building_id VARCHAR(10),
  recipient_type VARCHAR(50) DEFAULT 'all', -- all, staff, students
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  INDEX idx_active_notifs (is_active, created_at)
);

-- Room Maintenance Schedule
CREATE TABLE IF NOT EXISTS room_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  maintenance_type VARCHAR(100),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reason VARCHAR(500),
  assigned_to UUID REFERENCES staff(id),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_maintenance_dates (start_date, end_date),
  INDEX idx_room_maintenance (room_id)
);

-- Staff Availability (office hours, consultation slots)
CREATE TABLE IF NOT EXISTS staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255), -- room/office location
  availability_type VARCHAR(50) DEFAULT 'consultation', -- consultation, office_hours, class
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(staff_id, day_of_week, start_time)
);

-- Create indexes for performance
CREATE INDEX idx_staff_active ON staff USING btree (is_active);
CREATE INDEX idx_staff_assignments_active ON staff_assignments USING btree (is_active);
CREATE INDEX idx_bookings_status ON classroom_bookings USING btree (booking_status);
CREATE INDEX idx_bookings_date_range ON classroom_bookings USING btree (start_time, end_time);

-- Enable RLS (Row Level Security) for classroom_bookings
ALTER TABLE classroom_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for Bookings - Users can see their own bookings
CREATE POLICY "Users can view own bookings" ON classroom_bookings
  FOR SELECT USING (auth.uid() = staff_id OR auth.uid() = created_by);

-- RLS Policy for Bookings - Users can create bookings
CREATE POLICY "Users can create bookings" ON classroom_bookings
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policy for Bookings - Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON classroom_bookings
  FOR UPDATE USING (auth.uid() = created_by);

-- Function to check room availability
CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id VARCHAR(50),
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP
)
RETURNS TABLE(is_available BOOLEAN, conflicting_bookings INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT = 0 AS is_available,
    COUNT(*)::INT AS conflicting_bookings
  FROM classroom_bookings
  WHERE 
    room_id = p_room_id
    AND booking_status = 'confirmed'
    AND start_time < p_end_time
    AND end_time > p_start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff location by name
CREATE OR REPLACE FUNCTION get_staff_location(p_staff_name VARCHAR(255))
RETURNS TABLE(
  staff_id UUID,
  name VARCHAR,
  building_id VARCHAR,
  floor_number INT,
  room_id VARCHAR,
  department VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    sa.building_id,
    sa.floor_number,
    sa.room_id,
    s.department
  FROM staff s
  LEFT JOIN staff_assignments sa ON s.id = sa.staff_id AND sa.is_active = true
  WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', p_staff_name, '%'))
    AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to log room occupancy
CREATE OR REPLACE FUNCTION log_room_occupancy(
  p_room_id VARCHAR(50),
  p_status VARCHAR(50),
  p_occupied_by UUID,
  p_reason VARCHAR(500)
)
RETURNS TABLE(log_id UUID) AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO room_occupancy_log (room_id, occupancy_status, occupied_by, reason)
  VALUES (p_room_id, p_status, p_occupied_by, p_reason)
  RETURNING id INTO v_log_id;
  
  RETURN QUERY SELECT v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update staff.updated_at
CREATE OR REPLACE FUNCTION update_staff_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_update_timestamp
BEFORE UPDATE ON staff
FOR EACH ROW
EXECUTE FUNCTION update_staff_timestamp();

-- Trigger to update classroom_bookings.updated_at
CREATE TRIGGER bookings_update_timestamp
BEFORE UPDATE ON classroom_bookings
FOR EACH ROW
EXECUTE FUNCTION update_staff_timestamp();

-- Trigger to update staff_assignments.updated_at
CREATE TRIGGER assignments_update_timestamp
BEFORE UPDATE ON staff_assignments
FOR EACH ROW
EXECUTE FUNCTION update_staff_timestamp();

-- Sample Data (Optional - for testing)
-- Insert sample staff members
INSERT INTO staff (name, email, department, designation) VALUES
  ('Dr. Kumar', 'dr.kumar@rit.edu', 'Computer Science', 'Professor'),
  ('Prof. Singh', 'prof.singh@rit.edu', 'Engineering', 'Associate Professor'),
  ('Dr. Sharma', 'dr.sharma@rit.edu', 'Administration', 'Registrar')
ON CONFLICT DO NOTHING;

-- Insert sample staff assignments (will work after staff data is inserted)
-- This would need to be done after getting the actual staff IDs

-- Grant permissions to authenticated users
GRANT SELECT ON staff TO authenticated;
GRANT SELECT ON staff_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON classroom_bookings TO authenticated;
GRANT SELECT ON room_occupancy_log TO authenticated;
GRANT SELECT ON campus_notifications TO authenticated;
GRANT SELECT ON staff_availability TO authenticated;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
