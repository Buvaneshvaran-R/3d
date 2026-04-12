import { campusData } from "@/data/campusData";

export type IntelligenceStatus =
  | "FREE"
  | "SCHEDULED"
  | "OCCUPIED"
  | "UNATTENDED"
  | "SESSION_COMPLETED"
  | "OFFSITE";

export interface MockTeacherProfile {
  user_id: string;
  name: string;
  department: string | null;
}

export interface MockBlock {
  id: string;
  name: string;
  shape: string;
  description: string;
}

export interface MockFloor {
  id: string;
  block_id: string;
  floor_number: number;
}

export interface MockClassroom {
  id: string;
  block_id: string;
  floor_number: number;
  classroom_number: number;
  capacity: number;
  status: "available" | "occupied" | "unattended" | "scheduled";
}

export interface MockScheduleSlot {
  id: string;
  classroom_id: string;
  teacher_user_id: string;
  subject: string | null;
  department: string | null;
  section: string | null;
  slot_start: string;
  slot_end: string;
  session_status: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  offsite_marked_at: string | null;
  offsite_marked_by: string | null;
  offsite_reason: string | null;
  attendance_url: string | null;
}

export interface MockAllocation {
  classroom_id: string;
  building_id: string;
  room_number: number;
  allocated_staff: string;
  subject: string;
  batch: string;
  time_start: string;
  time_end: string;
  is_staff_present: boolean;
  substitute_staff?: string;
  session_status: IntelligenceStatus;
  department: string | null;
  teacher_user_id: string;
}

export interface MockSessionArchive {
  classroom_id: string;
  teacher_name: string;
  department: string | null;
  section: string | null;
  start_time: string;
  end_time: string;
  session_status: IntelligenceStatus;
  attendance_record: string;
  offsite_flag: boolean;
  archived_at: string;
  reason?: string | null;
}

export interface MockIntelligenceDataset {
  blocks: MockBlock[];
  floors: MockFloor[];
  classrooms: MockClassroom[];
  teachers: MockTeacherProfile[];
  schedules: MockScheduleSlot[];
}

const TEACHER_NAMES = [
  "Dr. Kumar",
  "Prof. Singh",
  "Dr. Sharma",
  "Prof. Patel",
  "Dr. Gupta",
  "Prof. Nair",
  "Dr. Rao",
  "Prof. Menon",
  "Dr. Iyer",
  "Prof. Reddy",
  "Dr. Krishnan",
  "Prof. Das",
];

const DEPARTMENTS = ["AI & DS", "CSE", "ECE", "IT"];
const SUBJECTS = [
  "Machine Learning",
  "Data Structures",
  "DAA",
  "Computer Networks",
  "Operating Systems",
  "DBMS",
  "Cloud Computing",
  "Web Systems",
];
const SECTIONS = ["III AI&DS A", "III AI&DS B", "II CSE A", "IV ECE A"];
const GRACE_MINUTES = 10;

const PERIOD_TEMPLATES = [
  [8, 0, 8, 50],
  [9, 0, 9, 50],
  [10, 0, 10, 50],
  [11, 0, 11, 50],
  [13, 0, 13, 50],
  [14, 0, 14, 50],
  [15, 0, 15, 50],
  [16, 0, 16, 50],
];

const pad = (value: number) => String(value).padStart(2, "0");

const buildIso = (referenceDate: Date, hours: number, minutes: number) => {
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const formatClock = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getTeacherProfile = (index: number): MockTeacherProfile => {
  const name = TEACHER_NAMES[index % TEACHER_NAMES.length];
  return {
    user_id: `mock-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    department: DEPARTMENTS[index % DEPARTMENTS.length],
  };
};

export function createMockIntelligenceDataset(referenceDate: Date = new Date()): MockIntelligenceDataset {
  const buildingConfigs = campusData.buildings.slice(0, 3);

  const blocks: MockBlock[] = buildingConfigs.map((building) => ({
    id: building.id,
    name: building.name,
    shape: building.type === "auditorium" ? "irregular" : "rectangular",
    description: `Mock ${building.name}`,
  }));

  const floors: MockFloor[] = [];
  const classrooms: MockClassroom[] = [];
  const teachers: MockTeacherProfile[] = [];
  const schedules: MockScheduleSlot[] = [];

  let teacherIndex = 0;

  buildingConfigs.forEach((building) => {
    [0, 1].forEach((floorNumber) => {
      floors.push({
        id: `${building.id}-F${floorNumber}`,
        block_id: building.id,
        floor_number: floorNumber,
      });

      for (let roomIndex = 0; roomIndex < 4; roomIndex += 1) {
        const classroomNumber = roomIndex + 1;
        const classroomId = `${building.id}-F${floorNumber}-R${classroomNumber}`;
        classrooms.push({
          id: classroomId,
          block_id: building.id,
          floor_number: floorNumber,
          classroom_number: classroomNumber,
          capacity: 40,
          status: "available",
        });

        const teacher = getTeacherProfile(teacherIndex);
        teachers.push(teacher);
        teacherIndex += 1;

        PERIOD_TEMPLATES.slice(0, 3).forEach(([startH, startM, endH, endM], slotIndex) => {
          const slotOffset = roomIndex * 7 + floorNumber * 3;
          const slotStartHour = startH + Math.floor((slotOffset + slotIndex) / 6);
          const slotStartMinute = (startM + ((slotOffset + slotIndex) % 6) * 8) % 60;
          const slotEndHour = endH + Math.floor((slotOffset + slotIndex) / 6);
          const slotEndMinute = (endM + ((slotOffset + slotIndex) % 6) * 8) % 60;
          const slotStart = buildIso(referenceDate, slotStartHour, slotStartMinute);
          const slotEnd = buildIso(referenceDate, slotEndHour, slotEndMinute);
          const isPresetConfirmed = roomIndex === 0 && slotIndex === 0;
          const isPresetOffsite = roomIndex === 3 && slotIndex === 0;

          schedules.push({
            id: `${classroomId}-S${slotIndex + 1}`,
            classroom_id: classroomId,
            teacher_user_id: teacher.user_id,
            subject: SUBJECTS[(teacherIndex + slotIndex) % SUBJECTS.length],
            department: teacher.department,
            section: SECTIONS[(roomIndex + floorNumber + slotIndex) % SECTIONS.length],
            slot_start: slotStart,
            slot_end: slotEnd,
            session_status: isPresetOffsite ? "OFFSITE" : isPresetConfirmed ? "OCCUPIED" : null,
            confirmed_at: isPresetConfirmed ? new Date(new Date(slotStart).getTime() + 5 * 60 * 1000).toISOString() : null,
            confirmed_by: isPresetConfirmed ? teacher.user_id : null,
            offsite_marked_at: isPresetOffsite ? new Date(new Date(slotStart).getTime() + 3 * 60 * 1000).toISOString() : null,
            offsite_marked_by: isPresetOffsite ? teacher.user_id : null,
            offsite_reason: isPresetOffsite ? "Department Event" : null,
            attendance_url: null,
          });
        });
      }
    });
  });

  return { blocks, floors, classrooms, teachers, schedules };
}

const getSlotStatus = (nowMs: number, slot: MockScheduleSlot): IntelligenceStatus => {
  if (slot.session_status === "OFFSITE") return "OFFSITE";

  const startMs = new Date(slot.slot_start).getTime();
  const endMs = new Date(slot.slot_end).getTime();

  if (nowMs < startMs) return "FREE";
  if (nowMs >= startMs && nowMs < endMs) {
    if (slot.confirmed_at) return "OCCUPIED";
    if (nowMs > startMs + GRACE_MINUTES * 60 * 1000) return "UNATTENDED";
    return "SCHEDULED";
  }
  if (nowMs >= endMs && nowMs < endMs + 60 * 1000) return "SESSION_COMPLETED";
  return "FREE";
};

export function buildMockAllocations(
  classrooms: MockClassroom[],
  schedules: MockScheduleSlot[],
  teachers: MockTeacherProfile[],
  now: Date
): MockAllocation[] {
  const nowMs = now.getTime();
  const byClassroom = new Map<string, MockScheduleSlot[]>();

  schedules.forEach((slot) => {
    const slots = byClassroom.get(slot.classroom_id) || [];
    slots.push(slot);
    byClassroom.set(slot.classroom_id, slots);
  });

  const allocations: MockAllocation[] = [];

  classrooms.forEach((classroom) => {
    const activeSlot = (byClassroom.get(classroom.id) || [])
      .sort((left, right) => new Date(left.slot_start).getTime() - new Date(right.slot_start).getTime())
      .find((slot) => {
        const startMs = new Date(slot.slot_start).getTime();
        const endMs = new Date(slot.slot_end).getTime();
        return nowMs >= startMs && nowMs <= endMs;
      });

    if (!activeSlot) return;

    const teacher = teachers.find((item) => item.user_id === activeSlot.teacher_user_id) || null;
    const status = getSlotStatus(nowMs, activeSlot);

    if (status === "FREE") return;

    allocations.push({
      classroom_id: classroom.id,
      building_id: classroom.block_id,
      room_number: classroom.classroom_number,
      allocated_staff: teacher?.name || "Unknown Teacher",
      subject: activeSlot.subject || "N/A",
      batch: activeSlot.section || "N/A",
      time_start: formatClock(activeSlot.slot_start),
      time_end: formatClock(activeSlot.slot_end),
      is_staff_present: status === "OCCUPIED",
      substitute_staff: status === "UNATTENDED" ? "Department substitute pending" : undefined,
      session_status: status,
      department: activeSlot.department,
      teacher_user_id: activeSlot.teacher_user_id,
    });
  });

  return allocations;
}

export function buildMockArchive(schedules: MockScheduleSlot[], teachers: MockTeacherProfile[], now: Date): MockSessionArchive[] {
  const nowMs = now.getTime();
  const archive: MockSessionArchive[] = [];

  schedules.forEach((slot) => {
    const startMs = new Date(slot.slot_start).getTime();
    const endMs = new Date(slot.slot_end).getTime();
    const status = getSlotStatus(nowMs, slot);

    if (status === "FREE" || nowMs < startMs) return;

    const teacher = teachers.find((item) => item.user_id === slot.teacher_user_id);
    archive.push({
      classroom_id: slot.classroom_id,
      teacher_name: teacher?.name || "Unknown Teacher",
      department: slot.department,
      section: slot.section,
      start_time: slot.slot_start,
      end_time: slot.slot_end,
      session_status: status,
      attendance_record: slot.confirmed_at ? "Attendance captured" : "Attendance pending",
      offsite_flag: status === "OFFSITE",
      archived_at: new Date(Math.max(nowMs, endMs)).toISOString(),
      reason: slot.offsite_reason,
    });
  });

  return archive.slice(-24);
}

export function withMockConfirmation(
  schedules: MockScheduleSlot[],
  classroomId: string,
  now: Date
): MockScheduleSlot[] {
  return schedules.map((slot) => {
    if (slot.classroom_id !== classroomId) return slot;
    const startMs = new Date(slot.slot_start).getTime();
    const endMs = new Date(slot.slot_end).getTime();
    const nowMs = now.getTime();
    if (nowMs < startMs || nowMs > endMs) return slot;

    return {
      ...slot,
      confirmed_at: new Date(nowMs).toISOString(),
      confirmed_by: slot.teacher_user_id,
      session_status: "OCCUPIED",
    };
  });
}
