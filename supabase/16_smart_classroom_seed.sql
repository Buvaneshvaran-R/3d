-- Smart Classroom Seed Data

-- Insert Blocks
INSERT INTO blocks (name, shape, description) VALUES
  ('Block A', 'square', 'Square shaped building with 3 floors'),
  ('Block B', 'rectangle', 'Long rectangle shaped building with 3 floors'),
  ('Block C', 'rectangle', 'Long rectangle shaped building with 7 floors')
ON CONFLICT (name) DO NOTHING;

-- Get block IDs (we'll use them for floor/classroom creation)
WITH block_ids AS (
  SELECT id, name FROM blocks WHERE name IN ('Block A', 'Block B', 'Block C')
)

-- Insert Floors for Block A (3 floors, no ground floor classes)
INSERT INTO floors (block_id, floor_number) 
SELECT id, floor_num 
FROM (
  SELECT (SELECT id FROM blocks WHERE name = 'Block A') as id, ARRAY[1, 2, 3] as floors
) x, 
LATERAL UNNEST(floors) as floor_num
ON CONFLICT (block_id, floor_number) DO NOTHING;

-- Insert Floors for Block B (3 floors, no ground floor classes)
INSERT INTO floors (block_id, floor_number) 
SELECT id, floor_num 
FROM (
  SELECT (SELECT id FROM blocks WHERE name = 'Block B') as id, ARRAY[1, 2, 3] as floors
) x, 
LATERAL UNNEST(floors) as floor_num
ON CONFLICT (block_id, floor_number) DO NOTHING;

-- Insert Floors for Block C (7 floors, no ground floor classes)
INSERT INTO floors (block_id, floor_number) 
SELECT id, floor_num 
FROM (
  SELECT (SELECT id FROM blocks WHERE name = 'Block C') as id, ARRAY[1, 2, 3, 4, 5, 6, 7] as floors
) x, 
LATERAL UNNEST(floors) as floor_num
ON CONFLICT (block_id, floor_number) DO NOTHING;

-- Insert Classrooms for Block A (8 classrooms per floor, floors 1-3, no ground floor)
INSERT INTO classrooms (floor_id, block_id, floor_number, classroom_number, capacity, status)
SELECT 
  f.id,
  f.block_id,
  f.floor_number,
  cr,
  30,
  'available'
FROM floors f
CROSS JOIN LATERAL GENERATE_SERIES(1, 8) as cr
WHERE f.block_id = (SELECT id FROM blocks WHERE name = 'Block A')
  AND f.floor_number IN (1, 2, 3)
ON CONFLICT (block_id, floor_number, classroom_number) DO NOTHING;

-- Insert Classrooms for Block B (7 classrooms, floors 1-3, no ground floor)
INSERT INTO classrooms (floor_id, block_id, floor_number, classroom_number, capacity, status)
SELECT 
  f.id,
  f.block_id,
  f.floor_number,
  cr,
  30,
  'available'
FROM floors f
CROSS JOIN LATERAL GENERATE_SERIES(1, 7) as cr
WHERE f.block_id = (SELECT id FROM blocks WHERE name = 'Block B')
  AND f.floor_number IN (1, 2, 3)
ON CONFLICT (block_id, floor_number, classroom_number) DO NOTHING;

-- Insert Classrooms for Block C (7 classrooms per floor, floors 1-7, no ground floor)
INSERT INTO classrooms (floor_id, block_id, floor_number, classroom_number, capacity, status)
SELECT 
  f.id,
  f.block_id,
  f.floor_number,
  cr,
  30,
  'available'
FROM floors f
CROSS JOIN LATERAL GENERATE_SERIES(1, 7) as cr
WHERE f.block_id = (SELECT id FROM blocks WHERE name = 'Block C')
  AND f.floor_number IN (1, 2, 3, 4, 5, 6, 7)
ON CONFLICT (block_id, floor_number, classroom_number) DO NOTHING;
