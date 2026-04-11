import { Building, Floor, Room, CampusData, Pathway, TreePlacement, StaffLocation } from '@/types/campus';

// ─────────────────────────────────────────────────────────
// BUILDING A — 4 floors (Ground + 3)
// Ground: special rooms + classrooms
// Floors 1–3: 6 classrooms + 1 staff room each
// ─────────────────────────────────────────────────────────
const buildingA: Building = {
  id: 'A',
  name: 'Block A - Academic Building',
  type: 'academic',
  position: { x: -70, y: 0, z: 0 },
  dimensions: { width: 28, depth: 18, height: 32 },
  color: { r: 0.86, g: 0.86, b: 0.86 },
  floors: [
    {
      number: 0,
      height: 0,
      rooms: [
        { id: 'A-F0-Principal', name: 'Principal Cabin',        type: 'office',       floorNumber: 0, buildingId: 'A', capacity: 2,  position: { x: -9, y: 0, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F0-Exam',      name: 'Exam Evaluation Center', type: 'exam_center',  floorNumber: 0, buildingId: 'A', capacity: 30, position: { x: -3, y: 0, z: -5 }, occupancyStatus: 'empty' },
        { id: 'A-F0-Storage',   name: 'Document Storage Room',  type: 'storage',      floorNumber: 0, buildingId: 'A', capacity: 0,  position: { x:  3, y: 0, z: -5 }, occupancyStatus: 'maintenance' },
        { id: 'A-F0-Service',   name: 'Student Service Center', type: 'service',      floorNumber: 0, buildingId: 'A', capacity: 20, position: { x:  9, y: 0, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F0-Class1',    name: 'Classroom A01',          type: 'classroom',    floorNumber: 0, buildingId: 'A', capacity: 40, position: { x: -9, y: 0, z:  2 }, occupancyStatus: 'occupied' },
        { id: 'A-F0-Class2',    name: 'Classroom A02',          type: 'classroom',    floorNumber: 0, buildingId: 'A', capacity: 40, position: { x: -3, y: 0, z:  2 }, occupancyStatus: 'empty' },
        { id: 'A-F0-Class3',    name: 'Classroom A03',          type: 'classroom',    floorNumber: 0, buildingId: 'A', capacity: 40, position: { x:  3, y: 0, z:  2 }, occupancyStatus: 'empty' },
        { id: 'A-F0-Class4',    name: 'Classroom A04',          type: 'classroom',    floorNumber: 0, buildingId: 'A', capacity: 40, position: { x:  9, y: 0, z:  2 }, occupancyStatus: 'maintenance' },
      ],
    },
    {
      number: 1,
      height: 8,
      rooms: [
        { id: 'A-F1-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 1, buildingId: 'A', capacity: 15, position: { x: -9, y: 8, z: -5 }, occupancyStatus: 'empty' },
        { id: 'A-F1-C1',    name: 'Classroom 101', type: 'classroom',  floorNumber: 1, buildingId: 'A', capacity: 40, position: { x: -3, y: 8, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F1-C2',    name: 'Classroom 102', type: 'classroom',  floorNumber: 1, buildingId: 'A', capacity: 40, position: { x:  3, y: 8, z: -5 }, occupancyStatus: 'empty' },
        { id: 'A-F1-C3',    name: 'Classroom 103', type: 'classroom',  floorNumber: 1, buildingId: 'A', capacity: 40, position: { x:  9, y: 8, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F1-C4',    name: 'Classroom 104', type: 'classroom',  floorNumber: 1, buildingId: 'A', capacity: 40, position: { x: -9, y: 8, z:  2 }, occupancyStatus: 'maintenance' },
        { id: 'A-F1-C5',    name: 'Classroom 105', type: 'classroom',  floorNumber: 1, buildingId: 'A', capacity: 40, position: { x: -3, y: 8, z:  2 }, occupancyStatus: 'empty' },
        { id: 'A-F1-C6',    name: 'Classroom 106', type: 'classroom',  floorNumber: 1, buildingId: 'A', capacity: 40, position: { x:  3, y: 8, z:  2 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 2,
      height: 16,
      rooms: [
        { id: 'A-F2-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 2, buildingId: 'A', capacity: 15, position: { x: -9, y: 16, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F2-C1',    name: 'Classroom 201', type: 'classroom',  floorNumber: 2, buildingId: 'A', capacity: 40, position: { x: -3, y: 16, z: -5 }, occupancyStatus: 'empty' },
        { id: 'A-F2-C2',    name: 'Classroom 202', type: 'classroom',  floorNumber: 2, buildingId: 'A', capacity: 40, position: { x:  3, y: 16, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F2-C3',    name: 'Classroom 203', type: 'classroom',  floorNumber: 2, buildingId: 'A', capacity: 40, position: { x:  9, y: 16, z: -5 }, occupancyStatus: 'maintenance' },
        { id: 'A-F2-C4',    name: 'Classroom 204', type: 'classroom',  floorNumber: 2, buildingId: 'A', capacity: 40, position: { x: -9, y: 16, z:  2 }, occupancyStatus: 'occupied' },
        { id: 'A-F2-C5',    name: 'Classroom 205', type: 'classroom',  floorNumber: 2, buildingId: 'A', capacity: 40, position: { x: -3, y: 16, z:  2 }, occupancyStatus: 'empty' },
        { id: 'A-F2-C6',    name: 'Classroom 206', type: 'classroom',  floorNumber: 2, buildingId: 'A', capacity: 40, position: { x:  3, y: 16, z:  2 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 3,
      height: 24,
      rooms: [
        { id: 'A-F3-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 3, buildingId: 'A', capacity: 15, position: { x: -9, y: 24, z: -5 }, occupancyStatus: 'empty' },
        { id: 'A-F3-C1',    name: 'Classroom 301', type: 'classroom',  floorNumber: 3, buildingId: 'A', capacity: 40, position: { x: -3, y: 24, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F3-C2',    name: 'Classroom 302', type: 'classroom',  floorNumber: 3, buildingId: 'A', capacity: 40, position: { x:  3, y: 24, z: -5 }, occupancyStatus: 'empty' },
        { id: 'A-F3-C3',    name: 'Classroom 303', type: 'classroom',  floorNumber: 3, buildingId: 'A', capacity: 40, position: { x:  9, y: 24, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'A-F3-C4',    name: 'Classroom 304', type: 'classroom',  floorNumber: 3, buildingId: 'A', capacity: 40, position: { x: -9, y: 24, z:  2 }, occupancyStatus: 'empty' },
        { id: 'A-F3-C5',    name: 'Classroom 305', type: 'classroom',  floorNumber: 3, buildingId: 'A', capacity: 40, position: { x: -3, y: 24, z:  2 }, occupancyStatus: 'maintenance' },
        { id: 'A-F3-C6',    name: 'Classroom 306', type: 'classroom',  floorNumber: 3, buildingId: 'A', capacity: 40, position: { x:  3, y: 24, z:  2 }, occupancyStatus: 'occupied' },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────
// BUILDING B — 4 floors (Ground + 3)
// Each floor: 6 classrooms + 1 staff room
// ─────────────────────────────────────────────────────────
const buildingB: Building = {
  id: 'B',
  name: 'Block B - Main Building',
  type: 'main',
  position: { x: 0, y: 0, z: 0 },
  dimensions: { width: 32, depth: 20, height: 32 },
  color: { r: 0.75, g: 0.80, b: 0.86 },
  floors: [
    {
      number: 0,
      height: 0,
      rooms: [
        { id: 'B-F0-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 0, buildingId: 'B', capacity: 15, position: { x: -10, y: 0, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F0-C1',    name: 'Classroom B01', type: 'classroom',  floorNumber: 0, buildingId: 'B', capacity: 40, position: { x:  -4, y: 0, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F0-C2',    name: 'Classroom B02', type: 'classroom',  floorNumber: 0, buildingId: 'B', capacity: 40, position: { x:   2, y: 0, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F0-C3',    name: 'Classroom B03', type: 'classroom',  floorNumber: 0, buildingId: 'B', capacity: 40, position: { x:   8, y: 0, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F0-C4',    name: 'Classroom B04', type: 'classroom',  floorNumber: 0, buildingId: 'B', capacity: 40, position: { x: -10, y: 0, z:  3 }, occupancyStatus: 'empty' },
        { id: 'B-F0-C5',    name: 'Classroom B05', type: 'classroom',  floorNumber: 0, buildingId: 'B', capacity: 40, position: { x:  -4, y: 0, z:  3 }, occupancyStatus: 'maintenance' },
        { id: 'B-F0-C6',    name: 'Classroom B06', type: 'classroom',  floorNumber: 0, buildingId: 'B', capacity: 40, position: { x:   2, y: 0, z:  3 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 1,
      height: 8,
      rooms: [
        { id: 'B-F1-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 1, buildingId: 'B', capacity: 15, position: { x: -10, y: 8, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F1-C1',    name: 'Classroom 101', type: 'classroom',  floorNumber: 1, buildingId: 'B', capacity: 40, position: { x:  -4, y: 8, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F1-C2',    name: 'Classroom 102', type: 'classroom',  floorNumber: 1, buildingId: 'B', capacity: 40, position: { x:   2, y: 8, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F1-C3',    name: 'Classroom 103', type: 'classroom',  floorNumber: 1, buildingId: 'B', capacity: 40, position: { x:   8, y: 8, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F1-C4',    name: 'Classroom 104', type: 'classroom',  floorNumber: 1, buildingId: 'B', capacity: 40, position: { x: -10, y: 8, z:  3 }, occupancyStatus: 'empty' },
        { id: 'B-F1-C5',    name: 'Classroom 105', type: 'classroom',  floorNumber: 1, buildingId: 'B', capacity: 40, position: { x:  -4, y: 8, z:  3 }, occupancyStatus: 'maintenance' },
        { id: 'B-F1-C6',    name: 'Classroom 106', type: 'classroom',  floorNumber: 1, buildingId: 'B', capacity: 40, position: { x:   2, y: 8, z:  3 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 2,
      height: 16,
      rooms: [
        { id: 'B-F2-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 2, buildingId: 'B', capacity: 15, position: { x: -10, y: 16, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F2-C1',    name: 'Classroom 201', type: 'classroom',  floorNumber: 2, buildingId: 'B', capacity: 40, position: { x:  -4, y: 16, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F2-C2',    name: 'Classroom 202', type: 'classroom',  floorNumber: 2, buildingId: 'B', capacity: 40, position: { x:   2, y: 16, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F2-C3',    name: 'Classroom 203', type: 'classroom',  floorNumber: 2, buildingId: 'B', capacity: 40, position: { x:   8, y: 16, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F2-C4',    name: 'Classroom 204', type: 'classroom',  floorNumber: 2, buildingId: 'B', capacity: 40, position: { x: -10, y: 16, z:  3 }, occupancyStatus: 'empty' },
        { id: 'B-F2-C5',    name: 'Classroom 205', type: 'classroom',  floorNumber: 2, buildingId: 'B', capacity: 40, position: { x:  -4, y: 16, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'B-F2-C6',    name: 'Classroom 206', type: 'classroom',  floorNumber: 2, buildingId: 'B', capacity: 40, position: { x:   2, y: 16, z:  3 }, occupancyStatus: 'maintenance' },
      ],
    },
    {
      number: 3,
      height: 24,
      rooms: [
        { id: 'B-F3-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 3, buildingId: 'B', capacity: 15, position: { x: -10, y: 24, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F3-C1',    name: 'Classroom 301', type: 'classroom',  floorNumber: 3, buildingId: 'B', capacity: 40, position: { x:  -4, y: 24, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F3-C2',    name: 'Classroom 302', type: 'classroom',  floorNumber: 3, buildingId: 'B', capacity: 40, position: { x:   2, y: 24, z: -5 }, occupancyStatus: 'occupied' },
        { id: 'B-F3-C3',    name: 'Classroom 303', type: 'classroom',  floorNumber: 3, buildingId: 'B', capacity: 40, position: { x:   8, y: 24, z: -5 }, occupancyStatus: 'empty' },
        { id: 'B-F3-C4',    name: 'Classroom 304', type: 'classroom',  floorNumber: 3, buildingId: 'B', capacity: 40, position: { x: -10, y: 24, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'B-F3-C5',    name: 'Classroom 305', type: 'classroom',  floorNumber: 3, buildingId: 'B', capacity: 40, position: { x:  -4, y: 24, z:  3 }, occupancyStatus: 'empty' },
        { id: 'B-F3-C6',    name: 'Classroom 306', type: 'classroom',  floorNumber: 3, buildingId: 'B', capacity: 40, position: { x:   2, y: 24, z:  3 }, occupancyStatus: 'maintenance' },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────
// BUILDING C — 8 floors (Ground + 7)
// Each floor: 1 staff room + 6 rooms (classrooms / seminar halls)
// Special: Floor 2 → Large Seminar Hall, Floor 6 → Premium Seminar Hall
// Room Y positions corrected: floor n → y = n × 6.5
// ─────────────────────────────────────────────────────────
const buildingC: Building = {
  id: 'C',
  name: 'Block C - Auditorium',
  type: 'auditorium',
  position: { x: 70, y: 0, z: 0 },
  dimensions: { width: 24, depth: 16, height: 52 },
  color: { r: 0.80, g: 0.75, b: 0.70 },
  floors: [
    {
      number: 0, height: 0,
      rooms: [
        { id: 'C-F0-Staff',   name: 'Staff Room',          type: 'staff_room', floorNumber: 0, buildingId: 'C', capacity: 20, position: { x: -7, y: 0,   z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F0-LibA',    name: 'Library Wing A',      type: 'classroom',  floorNumber: 0, buildingId: 'C', capacity: 50, position: { x:  0, y: 0,   z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F0-LibB',    name: 'Library Wing B',      type: 'classroom',  floorNumber: 0, buildingId: 'C', capacity: 50, position: { x:  7, y: 0,   z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F0-SR1',     name: 'Study Room 101',      type: 'classroom',  floorNumber: 0, buildingId: 'C', capacity: 30, position: { x: -7, y: 0,   z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F0-SR2',     name: 'Study Room 102',      type: 'classroom',  floorNumber: 0, buildingId: 'C', capacity: 30, position: { x:  0, y: 0,   z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F0-SR3',     name: 'Study Room 103',      type: 'classroom',  floorNumber: 0, buildingId: 'C', capacity: 30, position: { x:  7, y: 0,   z:  3 }, occupancyStatus: 'maintenance' },
        { id: 'C-F0-Seminar', name: 'Seminar Hall Ground', type: 'seminar_hall', floorNumber: 0, buildingId: 'C', capacity: 100, position: { x: 0, y: 0, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 1, height: 6.5,
      rooms: [
        { id: 'C-F1-Staff',  name: 'Staff Room',    type: 'staff_room', floorNumber: 1, buildingId: 'C', capacity: 20, position: { x: -7, y: 6.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F1-C1',     name: 'Classroom C11', type: 'classroom',  floorNumber: 1, buildingId: 'C', capacity: 40, position: { x:  0, y: 6.5, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F1-C2',     name: 'Classroom C12', type: 'classroom',  floorNumber: 1, buildingId: 'C', capacity: 40, position: { x:  7, y: 6.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F1-C3',     name: 'Classroom C13', type: 'classroom',  floorNumber: 1, buildingId: 'C', capacity: 40, position: { x: -7, y: 6.5, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F1-C4',     name: 'Classroom C14', type: 'classroom',  floorNumber: 1, buildingId: 'C', capacity: 40, position: { x:  0, y: 6.5, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F1-C5',     name: 'Classroom C15', type: 'classroom',  floorNumber: 1, buildingId: 'C', capacity: 40, position: { x:  7, y: 6.5, z:  3 }, occupancyStatus: 'maintenance' },
        { id: 'C-F1-Office', name: 'Admin Office',  type: 'office',     floorNumber: 1, buildingId: 'C', capacity: 5,  position: { x:  0, y: 6.5, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 2, height: 13,
      rooms: [
        { id: 'C-F2-Staff',  name: 'Staff Room',          type: 'staff_room',  floorNumber: 2, buildingId: 'C', capacity: 20,  position: { x: -7, y: 13, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F2-C1',     name: 'Classroom C21',       type: 'classroom',   floorNumber: 2, buildingId: 'C', capacity: 40,  position: { x:  0, y: 13, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F2-C2',     name: 'Classroom C22',       type: 'classroom',   floorNumber: 2, buildingId: 'C', capacity: 40,  position: { x:  7, y: 13, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F2-C3',     name: 'Classroom C23',       type: 'classroom',   floorNumber: 2, buildingId: 'C', capacity: 40,  position: { x: -7, y: 13, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F2-C4',     name: 'Classroom C24',       type: 'classroom',   floorNumber: 2, buildingId: 'C', capacity: 40,  position: { x:  0, y: 13, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F2-C5',     name: 'Classroom C25',       type: 'classroom',   floorNumber: 2, buildingId: 'C', capacity: 40,  position: { x:  7, y: 13, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F2-Seminar',name: 'Seminar Hall - Large', type: 'seminar_hall', floorNumber: 2, buildingId: 'C', capacity: 150, position: { x: 0, y: 13, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 3, height: 19.5,
      rooms: [
        { id: 'C-F3-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 3, buildingId: 'C', capacity: 20, position: { x: -7, y: 19.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F3-C1',    name: 'Classroom 301', type: 'classroom',  floorNumber: 3, buildingId: 'C', capacity: 40, position: { x:  0, y: 19.5, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F3-C2',    name: 'Classroom 302', type: 'classroom',  floorNumber: 3, buildingId: 'C', capacity: 40, position: { x:  7, y: 19.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F3-C3',    name: 'Classroom 303', type: 'classroom',  floorNumber: 3, buildingId: 'C', capacity: 40, position: { x: -7, y: 19.5, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F3-C4',    name: 'Classroom 304', type: 'classroom',  floorNumber: 3, buildingId: 'C', capacity: 40, position: { x:  0, y: 19.5, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F3-C5',    name: 'Classroom 305', type: 'classroom',  floorNumber: 3, buildingId: 'C', capacity: 40, position: { x:  7, y: 19.5, z:  3 }, occupancyStatus: 'maintenance' },
        { id: 'C-F3-Lab',   name: 'Computer Lab',  type: 'classroom',  floorNumber: 3, buildingId: 'C', capacity: 35, position: { x:  0, y: 19.5, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 4, height: 26,
      rooms: [
        { id: 'C-F4-Staff', name: 'Staff Room',    type: 'staff_room', floorNumber: 4, buildingId: 'C', capacity: 20, position: { x: -7, y: 26, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F4-C1',    name: 'Classroom 401', type: 'classroom',  floorNumber: 4, buildingId: 'C', capacity: 40, position: { x:  0, y: 26, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F4-C2',    name: 'Classroom 402', type: 'classroom',  floorNumber: 4, buildingId: 'C', capacity: 40, position: { x:  7, y: 26, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F4-C3',    name: 'Classroom 403', type: 'classroom',  floorNumber: 4, buildingId: 'C', capacity: 40, position: { x: -7, y: 26, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F4-C4',    name: 'Classroom 404', type: 'classroom',  floorNumber: 4, buildingId: 'C', capacity: 40, position: { x:  0, y: 26, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F4-C5',    name: 'Classroom 405', type: 'classroom',  floorNumber: 4, buildingId: 'C', capacity: 40, position: { x:  7, y: 26, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F4-Lab',   name: 'Science Lab',   type: 'classroom',  floorNumber: 4, buildingId: 'C', capacity: 35, position: { x:  0, y: 26, z:  6 }, occupancyStatus: 'maintenance' },
      ],
    },
    {
      number: 5, height: 32.5,
      rooms: [
        { id: 'C-F5-Staff', name: 'Staff Room',       type: 'staff_room', floorNumber: 5, buildingId: 'C', capacity: 20, position: { x: -7, y: 32.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F5-C1',    name: 'Classroom 501',    type: 'classroom',  floorNumber: 5, buildingId: 'C', capacity: 40, position: { x:  0, y: 32.5, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F5-C2',    name: 'Classroom 502',    type: 'classroom',  floorNumber: 5, buildingId: 'C', capacity: 40, position: { x:  7, y: 32.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F5-C3',    name: 'Classroom 503',    type: 'classroom',  floorNumber: 5, buildingId: 'C', capacity: 40, position: { x: -7, y: 32.5, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F5-C4',    name: 'Classroom 504',    type: 'classroom',  floorNumber: 5, buildingId: 'C', capacity: 40, position: { x:  0, y: 32.5, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F5-C5',    name: 'Classroom 505',    type: 'classroom',  floorNumber: 5, buildingId: 'C', capacity: 40, position: { x:  7, y: 32.5, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F5-Lab',   name: 'Electronics Lab',  type: 'classroom',  floorNumber: 5, buildingId: 'C', capacity: 35, position: { x:  0, y: 32.5, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 6, height: 39,
      rooms: [
        { id: 'C-F6-Staff',  name: 'Staff Room',              type: 'staff_room',  floorNumber: 6, buildingId: 'C', capacity: 20,  position: { x: -7, y: 39, z: -4 }, occupancyStatus: 'maintenance' },
        { id: 'C-F6-C1',     name: 'Classroom 601',           type: 'classroom',   floorNumber: 6, buildingId: 'C', capacity: 40,  position: { x:  0, y: 39, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F6-C2',     name: 'Classroom 602',           type: 'classroom',   floorNumber: 6, buildingId: 'C', capacity: 40,  position: { x:  7, y: 39, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F6-C3',     name: 'Classroom 603',           type: 'classroom',   floorNumber: 6, buildingId: 'C', capacity: 40,  position: { x: -7, y: 39, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F6-C4',     name: 'Classroom 604',           type: 'classroom',   floorNumber: 6, buildingId: 'C', capacity: 40,  position: { x:  0, y: 39, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F6-C5',     name: 'Classroom 605',           type: 'classroom',   floorNumber: 6, buildingId: 'C', capacity: 40,  position: { x:  7, y: 39, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F6-Seminar',name: 'Seminar Hall - Premium',  type: 'seminar_hall', floorNumber: 6, buildingId: 'C', capacity: 200, position: { x: 0,  y: 39, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
    {
      number: 7, height: 45.5,
      rooms: [
        { id: 'C-F7-Staff',  name: 'Staff Room',   type: 'staff_room', floorNumber: 7, buildingId: 'C', capacity: 20, position: { x: -7, y: 45.5, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F7-C1',     name: 'Classroom 701',type: 'classroom',  floorNumber: 7, buildingId: 'C', capacity: 40, position: { x:  0, y: 45.5, z: -4 }, occupancyStatus: 'occupied' },
        { id: 'C-F7-C2',     name: 'Classroom 702',type: 'classroom',  floorNumber: 7, buildingId: 'C', capacity: 40, position: { x:  7, y: 45.5, z: -4 }, occupancyStatus: 'empty' },
        { id: 'C-F7-C3',     name: 'Classroom 703',type: 'classroom',  floorNumber: 7, buildingId: 'C', capacity: 40, position: { x: -7, y: 45.5, z:  3 }, occupancyStatus: 'occupied' },
        { id: 'C-F7-C4',     name: 'Classroom 704',type: 'classroom',  floorNumber: 7, buildingId: 'C', capacity: 40, position: { x:  0, y: 45.5, z:  3 }, occupancyStatus: 'empty' },
        { id: 'C-F7-C5',     name: 'Classroom 705',type: 'classroom',  floorNumber: 7, buildingId: 'C', capacity: 40, position: { x:  7, y: 45.5, z:  3 }, occupancyStatus: 'maintenance' },
        { id: 'C-F7-Lounge', name: 'Sky Lounge',   type: 'classroom',  floorNumber: 7, buildingId: 'C', capacity: 75, position: { x:  0, y: 45.5, z:  6 }, occupancyStatus: 'occupied' },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────
// Campus pathways
// ─────────────────────────────────────────────────────────
const pathways: Pathway[] = [
  { id: 'path1', start: { x: -30, z: -20 }, end: { x: -30, z: 15 },  width: 3 },
  { id: 'path2', start: { x: -30, z:  15 }, end: { x:  65, z: 15 },  width: 3 },
  { id: 'path3', start: { x:   5, z: -20 }, end: { x:   5, z: 15 },  width: 3 },
  { id: 'path4', start: { x:  35, z: -20 }, end: { x:  35, z: 15 },  width: 3 },
  // Cross walkway behind buildings
  { id: 'path5', start: { x: -60, z: -45 }, end: { x:  75, z: -45 }, width: 2.5 },
];

// ─────────────────────────────────────────────────────────
// Trees
// ─────────────────────────────────────────────────────────
const trees: TreePlacement[] = [
  { id: 't1',  position: { x: -55, y: 0, z: -42 }, scale: 1.0 },
  { id: 't2',  position: { x: -50, y: 0, z: -36 }, scale: 1.2 },
  { id: 't3',  position: { x: -42, y: 0, z: -52 }, scale: 0.9 },
  { id: 't4',  position: { x: -22, y: 0, z: -52 }, scale: 1.1 },
  { id: 't5',  position: { x:   2, y: 0, z: -52 }, scale: 1.0 },
  { id: 't6',  position: { x:  22, y: 0, z: -52 }, scale: 1.3 },
  { id: 't7',  position: { x:  42, y: 0, z: -52 }, scale: 0.95 },
  { id: 't8',  position: { x:  60, y: 0, z: -42 }, scale: 1.1 },
  { id: 't9',  position: { x: -55, y: 0, z:  22 }, scale: 1.0 },
  { id: 't10', position: { x:  68, y: 0, z:  22 }, scale: 1.2 },
  { id: 't11', position: { x: -20, y: 0, z:  20 }, scale: 1.1 },
  { id: 't12', position: { x:  18, y: 0, z:  20 }, scale: 0.9 },
];

// ─────────────────────────────────────────────────────────
// Campus data export
// ─────────────────────────────────────────────────────────
export const campusData: CampusData = {
  buildings: [buildingA, buildingB, buildingC],
  pathways,
  trees,
};

// ─────────────────────────────────────────────────────────
// Staff location database
// ─────────────────────────────────────────────────────────
const staffLocationsDb: Record<string, StaffLocation> = {
  'Dr. Kumar': {
    staffName: 'Dr. Kumar', staffId: 'STAFF001',
    buildingId: 'A', floorNumber: 2, roomId: 'A-F2-C4', roomName: 'Classroom 204',
  },
  'Prof. Singh': {
    staffName: 'Prof. Singh', staffId: 'STAFF002',
    buildingId: 'B', floorNumber: 1, roomId: 'B-F1-Staff', roomName: 'Staff Room',
  },
  'Dr. Sharma': {
    staffName: 'Dr. Sharma', staffId: 'STAFF003',
    buildingId: 'C', floorNumber: 2, roomId: 'C-F2-Seminar', roomName: 'Seminar Hall - Large',
  },
  'Prof. Patel': {
    staffName: 'Prof. Patel', staffId: 'STAFF004',
    buildingId: 'A', floorNumber: 1, roomId: 'A-F1-C1', roomName: 'Classroom 101',
  },
  'Dr. Gupta': {
    staffName: 'Dr. Gupta', staffId: 'STAFF005',
    buildingId: 'B', floorNumber: 0, roomId: 'B-F0-C2', roomName: 'Classroom B02',
  },
  'Prof. Nair': {
    staffName: 'Prof. Nair', staffId: 'STAFF006',
    buildingId: 'A', floorNumber: 3, roomId: 'A-F3-C3', roomName: 'Classroom 303',
  },
  'Dr. Rao': {
    staffName: 'Dr. Rao', staffId: 'STAFF007',
    buildingId: 'B', floorNumber: 2, roomId: 'B-F2-C3', roomName: 'Classroom 203',
  },
  'Prof. Menon': {
    staffName: 'Prof. Menon', staffId: 'STAFF008',
    buildingId: 'C', floorNumber: 4, roomId: 'C-F4-C1', roomName: 'Classroom 401',
  },
  'Dr. Iyer': {
    staffName: 'Dr. Iyer', staffId: 'STAFF009',
    buildingId: 'C', floorNumber: 6, roomId: 'C-F6-Seminar', roomName: 'Seminar Hall - Premium',
  },
  'Prof. Reddy': {
    staffName: 'Prof. Reddy', staffId: 'STAFF010',
    buildingId: 'B', floorNumber: 3, roomId: 'B-F3-C5', roomName: 'Classroom 305',
  },
  'Dr. Krishnan': {
    staffName: 'Dr. Krishnan', staffId: 'STAFF011',
    buildingId: 'A', floorNumber: 0, roomId: 'A-F0-Principal', roomName: 'Principal Cabin',
  },
  'Prof. Das': {
    staffName: 'Prof. Das', staffId: 'STAFF012',
    buildingId: 'C', floorNumber: 7, roomId: 'C-F7-C1', roomName: 'Classroom 701',
  },
};

export const findStaffLocation = (staffName: string): StaffLocation | null => {
  // Exact match first
  if (staffLocationsDb[staffName]) return staffLocationsDb[staffName];
  // Partial / case-insensitive match
  const lower = staffName.toLowerCase();
  const key = Object.keys(staffLocationsDb).find(k => k.toLowerCase().includes(lower));
  return key ? staffLocationsDb[key] : null;
};

export const findTeacherByRoomId = (roomId: string): StaffLocation | null => {
  return Object.values(staffLocationsDb).find(s => s.roomId === roomId) ?? null;
};

export const getAllStaffLocations = (): StaffLocation[] => Object.values(staffLocationsDb);

export default campusData;
