import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, Clock, Search, User, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FloorVisualizer } from "@/components/FloorVisualizer";
import { campusData } from "@/data/campusData";
import {
  buildMockAllocations,
  buildMockArchive,
  createMockIntelligenceDataset,
  withMockConfirmation,
} from "@/lib/classroomIntelligence";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Classroom {
  id: string;
  block_id: string;
  floor_number: number;
  classroom_number: number;
  capacity: number;
  status: "available" | "occupied" | "unattended" | "scheduled";
}

interface Block {
  id: string;
  name: string;
  shape: string;
  description: string;
}

interface Floor {
  id: string;
  block_id: string;
  floor_number: number;
}

interface ClassroomAttendance {
  id: string;
  classroom_id: string;
  teacher_id: string;
  marked_in_at: string;
  marked_out_at: string | null;
  status: string;
}

interface ScheduleSlot {
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
  session_status?: string | null;
}

interface TeacherProfile {
  user_id: string;
  name: string;
  department: string | null;
}

interface TimetableEntry {
  id: string;
  staff_id: string;
  classroom_id: string;
  day_of_week: number;
  period_start: string;
  period_end: string;
  subject: string;
  batch: string;
  section: string;
}

interface ClassroomAllocation {
  classroom_id: string;
  building_id: string;
  floor_number: number;
  room_number: number;
  allocated_staff: string;
  subject: string;
  batch: string;
  time_start: string;
  time_end: string;
  is_staff_present: boolean;
  substitute_staff?: string;
  session_status?: LiveClassroomState;
  department?: string | null;
  teacher_user_id?: string;
}

type LiveClassroomState =
  | "FREE"
  | "SCHEDULED"
  | "OCCUPIED"
  | "UNATTENDED"
  | "SESSION_COMPLETED"
  | "OFFSITE";

type NavigatorScope = "block" | "floor" | "classroom";

type ClassroomTourStep = {
  label: string;
  buildingId: string | null;
  floor: number | null;
};

type FloorTourStep = {
  label: string;
  value: number;
};

const GRACE_MINUTES = 10;
const OFFSITE_REASONS = [
  "Industrial Visit",
  "Department Event",
  "Seminar",
  "Sports Activity",
  "Placement Training",
  "Lab Maintenance",
  "Other",
];

const CLASS_PERIODS = [
  { label: "08:00-08:50", startMinutes: 8 * 60, endMinutes: 8 * 60 + 50 },
  { label: "08:50-09:40", startMinutes: 8 * 60 + 50, endMinutes: 9 * 60 + 40 },
  { label: "10:10-11:00", startMinutes: 10 * 60 + 10, endMinutes: 11 * 60 },
  { label: "11:00-11:50", startMinutes: 11 * 60, endMinutes: 11 * 60 + 50 },
  { label: "11:50-12:40", startMinutes: 11 * 60 + 50, endMinutes: 12 * 60 + 40 },
  { label: "13:30-14:15", startMinutes: 13 * 60 + 30, endMinutes: 14 * 60 + 15 },
  { label: "14:15-15:00", startMinutes: 14 * 60 + 15, endMinutes: 15 * 60 },
];

const BLOCKED_BOOKING_WINDOWS = [
  { startMinutes: 9 * 60 + 40, endMinutes: 10 * 60 + 10 },
  { startMinutes: 12 * 60 + 40, endMinutes: 13 * 60 + 30 },
];

const resolveBookingPeriod = (reference: Date) => {
  const nowMinutes = reference.getHours() * 60 + reference.getMinutes();

  const isBlockedWindow = BLOCKED_BOOKING_WINDOWS.some(
    (window) => nowMinutes >= window.startMinutes && nowMinutes < window.endMinutes
  );
  if (isBlockedWindow) return null;

  const period = CLASS_PERIODS.find((item) => nowMinutes >= item.startMinutes && nowMinutes < item.endMinutes);
  if (!period) {
    if (nowMinutes >= 15 * 60) {
      const slotStart = new Date(reference);
      slotStart.setSeconds(0, 0);

      const slotEnd = new Date(reference);
      slotEnd.setHours(23, 59, 59, 999);

      return {
        label: "After 15:00",
        slotStart,
        slotEnd,
      };
    }

    return null;
  }

  const periodStart = new Date(reference);
  periodStart.setHours(Math.floor(period.startMinutes / 60), period.startMinutes % 60, 0, 0);

  const periodEnd = new Date(reference);
  periodEnd.setHours(Math.floor(period.endMinutes / 60), period.endMinutes % 60, 0, 0);

  const slotStart = reference > periodStart ? reference : periodStart;
  return {
    label: period.label,
    slotStart,
    slotEnd: periodEnd,
  };
};

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (!error) return fallback;

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object") {
    const maybe = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      error_description?: string;
    };

    const parts = [
      maybe.message,
      maybe.error_description,
      maybe.details,
      maybe.hint,
      maybe.code ? `code: ${maybe.code}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return fallback;
};

const isMissingScheduleTableError = (error: unknown) => {
  if (!error) return false;

  const text =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error);

  const normalized = text.toLowerCase();
  return normalized.includes("pgrst205") || normalized.includes("classroom_schedule_slots");
};

const normalizeSearchText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const isTeacherNameMatch = (name: string, query: string) => {
  const normalizedName = normalizeSearchText(name);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;
  if (!normalizedName) return false;
  if (normalizedName === normalizedQuery) return true;

  const nameTokens = normalizedName.split(" ").filter(Boolean);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  return queryTokens.every((queryToken) =>
    nameTokens.some((nameToken) => nameToken.startsWith(queryToken))
  );
};

const SmartClassroom = () => {
  const { user, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [classroomAllocations, setClassroomAllocations] = useState<ClassroomAllocation[]>([]);
  const [staffAbsences, setStaffAbsences] = useState<Map<string, boolean>>(new Map());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [simulationMode, setSimulationMode] = useState(false);

  const [mode, setMode] = useState<"overview" | "navigator" | "floorDetection">("overview");
  const [navigatorScope, setNavigatorScope] = useState<NavigatorScope>("block");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSlot | null>(null);
  const [offsiteReason, setOffsiteReason] = useState<string>(OFFSITE_REASONS[0]);
  const [searchTeacher, setSearchTeacher] = useState<string>("");
  const [navigatorTeacherQuery, setNavigatorTeacherQuery] = useState<string>("");
  
  // Floor Detection States
  const [floorDetectionBuilding, setFloorDetectionBuilding] = useState<string>("A");
  const [floorDetectionFloor, setFloorDetectionFloor] = useState<number>(-1);

  const [showDetails, setShowDetails] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isSavingScheduleAction, setIsSavingScheduleAction] = useState(false);
  const [classroomStatus, setClassroomStatus] = useState<ClassroomAttendance | null>(null);
  const [mockScheduleOverrides, setMockScheduleOverrides] = useState<Record<string, ScheduleSlot>>({});
  const [classroomTourIndex, setClassroomTourIndex] = useState(0);
  const [floorTourIndex, setFloorTourIndex] = useState(0);
  const [isScheduleTableAvailable, setIsScheduleTableAvailable] = useState(true);
  const [allocationTimeFilter, setAllocationTimeFilter] = useState<string>("all");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mockDataset = useMemo(() => createMockIntelligenceDataset(currentTime), [simulationMode]);
  const classroomTour: ClassroomTourStep[] = useMemo(
    () => [
      { label: "dummy", buildingId: null, floor: null },
      { label: "A", buildingId: "A", floor: 0 },
      { label: "B", buildingId: "B", floor: 0 },
      { label: "C", buildingId: "C", floor: 0 },
      { label: "dummy", buildingId: null, floor: null },
    ],
    []
  );

  const buildingFloorCounts: Record<string, number> = {
    A: 4,
    B: 4,
    C: 8,
  };

  const floorTourSteps: FloorTourStep[] = useMemo(() => {
    if (floorDetectionBuilding === "dummy") {
      return [{ label: "full block", value: -1 }];
    }

    const maxFloors = buildingFloorCounts[floorDetectionBuilding] || 1;
    const sequence: FloorTourStep[] = [{ label: "full block", value: -1 }, { label: "ground", value: 0 }];

    for (let floor = 1; floor < maxFloors; floor += 1) {
      sequence.push({ label: String(floor), value: floor });
    }

    sequence.push({ label: "full block", value: -1 });
    return sequence;
  }, [floorDetectionBuilding]);

  const blockDisplayLabel = useMemo(() => {
    const current = classroomTour[classroomTourIndex];
    if (!current?.buildingId) return "dummy";
    if (current.buildingId === "A") return "A";
    if (current.buildingId === "B") return "B";
    if (current.buildingId === "C") return "C";
    return current.label;
  }, [classroomTour, classroomTourIndex]);

  const statusColorClass: Record<LiveClassroomState, string> = {
    FREE: "bg-green-500",
    OCCUPIED: "bg-red-500",
    UNATTENDED: "bg-yellow-500",
    SCHEDULED: "bg-blue-500",
    SESSION_COMPLETED: "bg-slate-500",
    OFFSITE: "bg-violet-500",
  };

  const statusLabelClass: Record<LiveClassroomState, string> = {
    FREE: "border-green-200 bg-green-100 text-green-900",
    OCCUPIED: "border-red-200 bg-red-100 text-red-900",
    UNATTENDED: "border-yellow-200 bg-yellow-100 text-yellow-900",
    SCHEDULED: "border-blue-200 bg-blue-100 text-blue-900",
    SESSION_COMPLETED: "border-slate-200 bg-slate-100 text-slate-900",
    OFFSITE: "border-violet-200 bg-violet-100 text-violet-900",
  };

  const getBlockCode = (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return "X";
    const matched = block.name.match(/[A-Za-z]/g);
    return matched && matched.length > 0 ? matched[matched.length - 1].toUpperCase() : "X";
  };

  const getClassroomCode = (classroom: Classroom) => {
    const blockCode = getBlockCode(classroom.block_id);
    const roomCode = `${classroom.floor_number}${String(classroom.classroom_number).padStart(2, "0")}`;
    return `${blockCode}-${roomCode}`;
  };

  const getLiveStatusLabel = (state: LiveClassroomState) => {
    if (state === "FREE") return "Free";
    if (state === "SCHEDULED") return "Scheduled";
    if (state === "OCCUPIED") return "Occupied";
    if (state === "UNATTENDED") return "Unattended";
    if (state === "SESSION_COMPLETED") return "Session Completed";
    return "Offsite";
  };

  const getTeacher = (teacherUserId: string | null | undefined) => {
    if (!teacherUserId) return null;
    return teachers.find((teacher) => teacher.user_id === teacherUserId) || null;
  };

  const normalizeSchedule = (schedule: ScheduleSlot): ScheduleSlot => {
    const override = mockScheduleOverrides[schedule.id];
    return override ? { ...schedule, ...override } : schedule;
  };

  // Calculate classroom allocations based on timetable and current time
  const calculateAllocations = () => {
    const now = currentTime;
    const allocations: ClassroomAllocation[] = [];

    schedules.forEach((schedule) => {
      const slot = normalizeSchedule(schedule);
      if (slot.session_status === "SESSION_COMPLETED" || slot.session_status === "OFFSITE") return;
      const slotStart = new Date(slot.slot_start);
      const slotEnd = new Date(slot.slot_end);

      // Check if current time falls within this slot
      if (now >= slotStart && now <= slotEnd) {
        const classroom = classrooms.find((c) => c.id === slot.classroom_id);
        const teacher = getTeacher(slot.teacher_user_id);

        if (classroom && teacher) {
          // Check if staff marked present
          const isPresent = slot.confirmed_at != null || slot.session_status === "OCCUPIED";
          let substituteStaff: string | undefined;

          // If staff is absent, find available substitute
          if (!isPresent) {
            const availableStaff = teachers.find((t) =>
              t.user_id !== slot.teacher_user_id && t.department === teacher.department
            );
            substituteStaff = availableStaff?.name;
          }

          allocations.push({
            classroom_id: slot.classroom_id,
            building_id: getBlockCode(classroom.block_id),
            floor_number: classroom.floor_number,
            room_number: classroom.classroom_number,
            allocated_staff: teacher.name,
            subject: slot.subject || "N/A",
            batch: slot.section || "N/A",
            time_start: slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            time_end: slotEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            is_staff_present: isPresent,
            substitute_staff: substituteStaff,
            session_status: (slot.session_status as LiveClassroomState) || (isPresent ? "OCCUPIED" : "SCHEDULED"),
            department: slot.department || teacher.department,
            teacher_user_id: slot.teacher_user_id,
          });
        }
      }
    });

    setClassroomAllocations(allocations);
  };

  // Get available classrooms for a staff member during their free periods
  const getAvailableClassroomsForStaff = (staffUserId: string) => {
    const now = new Date();
    const occupiedClassrooms = new Set<string>();

    schedules.forEach((schedule) => {
      const slotStart = new Date(schedule.slot_start);
      const slotEnd = new Date(schedule.slot_end);
      if (now >= slotStart && now <= slotEnd) {
        occupiedClassrooms.add(schedule.classroom_id);
      }
    });

    return classrooms.filter((c) => !occupiedClassrooms.has(c.id));
  };

  // Check staff presence from schedule
  const checkStaffPresence = () => {
    const now = currentTime;
    const absences = new Map<string, boolean>();

    schedules.forEach((schedule) => {
      const slot = normalizeSchedule(schedule);
      const slotStart = new Date(slot.slot_start);
      const slotEnd = new Date(slot.slot_end);

      if (now >= slotStart && now <= slotEnd) {
        const isPresent = slot.confirmed_at != null || slot.session_status === "OCCUPIED";
        absences.set(slot.teacher_user_id, !isPresent);
      }
    });

    setStaffAbsences(absences);
  };

  const refreshData = async () => {
    if (simulationMode) {
      setBlocks(mockDataset.blocks as Block[]);
      setFloors(mockDataset.floors as Floor[]);
      setClassrooms(mockDataset.classrooms as Classroom[]);
      setTeachers(mockDataset.teachers as TeacherProfile[]);
      setSchedules(mockDataset.schedules as ScheduleSlot[]);
      return;
    }

    const [blocksRes, floorsRes, classroomsRes, teachersRes] = await Promise.all([
      supabase.from("blocks").select("*"),
      supabase.from("floors").select("*"),
      supabase.from("classrooms").select("*"),
      supabase.from("admins").select("user_id,name,department"),
    ]);

    if (blocksRes.error) throw blocksRes.error;
    if (floorsRes.error) throw floorsRes.error;
    if (classroomsRes.error) throw classroomsRes.error;
    if (teachersRes.error) throw teachersRes.error;

    setBlocks(blocksRes.data || []);
    setFloors(floorsRes.data || []);
    setClassrooms((classroomsRes.data || []) as Classroom[]);
    setTeachers((teachersRes.data || []) as TeacherProfile[]);

    const scheduleRes = await supabase
      .from("classroom_schedule_slots")
      .select("*")
      .gte("slot_end", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .order("slot_start", { ascending: true });

    if (!scheduleRes.error) {
      setIsScheduleTableAvailable(true);
      setSchedules((scheduleRes.data || []) as ScheduleSlot[]);
    } else {
      // Fallback for environments where the advanced tables are not migrated yet.
      setIsScheduleTableAvailable(false);
      setSchedules([]);
    }
  };

  // Fetch core data and subscribe to realtime updates.
  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error("Error fetching classroom intelligence data:", error);
        toast({
          title: "Error",
          description: "Failed to load classroom intelligence data",
          variant: "destructive",
        });
      }
    };

    fetchData();

    const classroomSubscription = supabase
      .channel("classroom-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "classrooms" }, fetchData)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classroom_schedule_slots" },
        fetchData
      )
      .subscribe();

    const attendanceSubscription = supabase
      .channel("classroom-attendance-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classroom_attendance" },
        fetchData
      )
      .subscribe();

    const statusAutoTick = setInterval(fetchData, 60 * 1000);

    return () => {
      clearInterval(statusAutoTick);
      classroomSubscription.unsubscribe();
      attendanceSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshData().catch((error) => {
      console.error("Failed to refresh classroom data for current mode:", error);
    });
  }, [simulationMode, mockDataset]);

  useEffect(() => {
    if (!selectedClassroom) {
      setClassroomStatus(null);
      return;
    }

    if (simulationMode) {
      setClassroomStatus(null);
      return;
    }

    const fetchActiveAttendance = async () => {
      const { data } = await supabase
        .from("classroom_attendance")
        .select("*")
        .eq("classroom_id", selectedClassroom.id)
        .is("marked_out_at", null)
        .maybeSingle();

      setClassroomStatus(data || null);
    };

    fetchActiveAttendance();
  }, [selectedClassroom, simulationMode]);

  // Update allocations when schedules or time changes
  useEffect(() => {
    calculateAllocations();
    checkStaffPresence();
  }, [schedules, classrooms, teachers, currentTime]);

  // Update current time every minute
  useEffect(() => {
    const tick = () => {
      if (simulationMode) {
        setCurrentTime((prev) => new Date(prev.getTime() + 60 * 1000));
        return;
      }

      setCurrentTime(new Date());
    };

    const timeInterval = setInterval(tick, simulationMode ? 1000 : 60000);

    return () => clearInterval(timeInterval);
  }, [simulationMode]);

  useEffect(() => {
    setSelectedFloor("all");
  }, [selectedBlock]);

  const availableFloors = (() => {
    const filtered =
      selectedBlock === "all"
        ? floors
        : floors.filter((floor) => floor.block_id === selectedBlock);
    return [...new Set(filtered.map((floor) => floor.floor_number))].sort((a, b) => a - b);
  })();

  const orderedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.name.localeCompare(b.name)),
    [blocks]
  );

  const navigatorFocusLabel = useMemo(() => {
    const activeBlock = orderedBlocks.find((block) => block.id === selectedBlock) || null;

    if (navigatorScope === "block") {
      return activeBlock ? activeBlock.name : "No block selected";
    }

    if (navigatorScope === "floor") {
      if (!activeBlock || selectedFloor === "all") {
        return "Select block and floor";
      }
      return `${activeBlock.name} - Floor ${selectedFloor}`;
    }

    if (selectedClassroom) {
      return getClassroomCode(selectedClassroom);
    }

    return "Select a classroom";
  }, [orderedBlocks, navigatorScope, selectedBlock, selectedFloor, selectedClassroom]);

  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((room) => {
      const byBlock = selectedBlock === "all" || room.block_id === selectedBlock;
      const byFloor = selectedFloor === "all" || String(room.floor_number) === selectedFloor;
      return byBlock && byFloor;
    });
  }, [classrooms, selectedBlock, selectedFloor]);

  const getFloorsForBlock = (blockId: string) => {
    return floors
      .filter((floor) => floor.block_id === blockId)
      .map((floor) => floor.floor_number)
      .sort((a, b) => a - b);
  };

  const getClassroomsForBlockAndFloor = (blockId: string, floorNo: number) => {
    return classrooms
      .filter((room) => room.block_id === blockId && room.floor_number === floorNo)
      .sort((a, b) => a.classroom_number - b.classroom_number);
  };

  useEffect(() => {
    if (mode !== "navigator") return;
    if (orderedBlocks.length === 0) return;

    if (navigatorScope === "block") {
      if (selectedBlock === "all" || !orderedBlocks.some((b) => b.id === selectedBlock)) {
        setSelectedBlock(orderedBlocks[0].id);
      }
      return;
    }

    const blockId = selectedBlock === "all" ? orderedBlocks[0].id : selectedBlock;
    if (selectedBlock === "all") {
      setSelectedBlock(blockId);
      return;
    }

    const blockFloors = getFloorsForBlock(blockId);
    if (blockFloors.length === 0) return;

    if (navigatorScope === "floor") {
      if (selectedFloor === "all" || !blockFloors.includes(Number(selectedFloor))) {
        setSelectedFloor(String(blockFloors[0]));
      }
      return;
    }

    const floorNo = selectedFloor === "all" ? blockFloors[0] : Number(selectedFloor);
    if (selectedFloor === "all") {
      setSelectedFloor(String(floorNo));
      return;
    }

    const floorClassrooms = getClassroomsForBlockAndFloor(blockId, floorNo);
    if (floorClassrooms.length === 0) return;

    if (!selectedClassroom || !floorClassrooms.some((room) => room.id === selectedClassroom.id)) {
      setSelectedClassroom(floorClassrooms[0]);
    }
  }, [
    mode,
    navigatorScope,
    orderedBlocks,
    floors,
    classrooms,
    selectedBlock,
    selectedFloor,
    selectedClassroom,
  ]);

  const handleNavigatorArrow = (direction: -1 | 1) => {
    if (orderedBlocks.length === 0) return;

    if (navigatorScope === "block") {
      const blockIds = orderedBlocks.map((block) => block.id);
      const currentId = selectedBlock === "all" ? blockIds[0] : selectedBlock;
      const currentIndex = Math.max(0, blockIds.indexOf(currentId));
      const nextIndex = (currentIndex + direction + blockIds.length) % blockIds.length;
      setSelectedBlock(blockIds[nextIndex]);
      return;
    }

    const activeBlockId = selectedBlock === "all" ? orderedBlocks[0].id : selectedBlock;
    if (selectedBlock === "all") {
      setSelectedBlock(activeBlockId);
    }

    const blockFloors = getFloorsForBlock(activeBlockId);
    if (blockFloors.length === 0) return;

    if (navigatorScope === "floor") {
      const currentFloor = selectedFloor === "all" ? blockFloors[0] : Number(selectedFloor);
      const currentIndex = Math.max(0, blockFloors.indexOf(currentFloor));
      const nextIndex = (currentIndex + direction + blockFloors.length) % blockFloors.length;
      setSelectedFloor(String(blockFloors[nextIndex]));
      return;
    }

    const activeFloor = selectedFloor === "all" ? blockFloors[0] : Number(selectedFloor);
    if (selectedFloor === "all") {
      setSelectedFloor(String(activeFloor));
    }

    const floorClassrooms = getClassroomsForBlockAndFloor(activeBlockId, activeFloor);
    if (floorClassrooms.length === 0) return;

    const currentRoomId = selectedClassroom?.id || floorClassrooms[0].id;
    const roomIds = floorClassrooms.map((room) => room.id);
    const currentIndex = Math.max(0, roomIds.indexOf(currentRoomId));
    const nextIndex = (currentIndex + direction + roomIds.length) % roomIds.length;
    const nextRoom = floorClassrooms[nextIndex];
    setSelectedClassroom(nextRoom);
  };

  const liveModel = useMemo(() => {
    const nowMs = currentTime.getTime();
    const scheduleByClassroom = new Map<string, ScheduleSlot[]>();

    schedules.forEach((slot) => {
      const current = scheduleByClassroom.get(slot.classroom_id) || [];
      current.push(slot);
      scheduleByClassroom.set(slot.classroom_id, current);
    });

    const classroomStateMap = new Map<string, LiveClassroomState>();
    const activeSlotMap = new Map<string, ScheduleSlot>();

    classrooms.forEach((room) => {
      const slots = (scheduleByClassroom.get(room.id) || []).sort(
        (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
      );

      if (slots.length === 0) {
        if (room.status === "occupied") classroomStateMap.set(room.id, "OCCUPIED");
        else if (room.status === "unattended") classroomStateMap.set(room.id, "UNATTENDED");
        else if (room.status === "scheduled") classroomStateMap.set(room.id, "SCHEDULED");
        else classroomStateMap.set(room.id, "FREE");
        return;
      }

      const activeSlot = slots.find((slot) => {
        const startMs = new Date(slot.slot_start).getTime();
        const endMs = new Date(slot.slot_end).getTime();
        return nowMs >= startMs && nowMs < endMs;
      });

      if (activeSlot) {
        activeSlotMap.set(room.id, activeSlot);

        if (activeSlot.offsite_marked_at || activeSlot.session_status === "OFFSITE") {
          classroomStateMap.set(room.id, "OFFSITE");
          return;
        }

        if (activeSlot.confirmed_at || activeSlot.session_status === "OCCUPIED") {
          classroomStateMap.set(room.id, "OCCUPIED");
          return;
        }

        const startMs = new Date(activeSlot.slot_start).getTime();
        if (nowMs > startMs + GRACE_MINUTES * 60 * 1000) {
          classroomStateMap.set(room.id, "UNATTENDED");
        } else {
          classroomStateMap.set(room.id, "SCHEDULED");
        }
        return;
      }

      const latestEndedSlot = [...slots]
        .filter((slot) => new Date(slot.slot_end).getTime() <= nowMs)
        .sort((a, b) => new Date(b.slot_end).getTime() - new Date(a.slot_end).getTime())[0];

      if (latestEndedSlot && nowMs - new Date(latestEndedSlot.slot_end).getTime() < 60 * 1000) {
        classroomStateMap.set(room.id, "SESSION_COMPLETED");
        activeSlotMap.set(room.id, latestEndedSlot);
      } else {
        classroomStateMap.set(room.id, "FREE");
      }
    });

    return { classroomStateMap, activeSlotMap };
  }, [classrooms, schedules]);

  useEffect(() => {
    if (!selectedClassroom) {
      setSelectedSchedule(null);
      return;
    }

    const activeOrLatestSlot = liveModel.activeSlotMap.get(selectedClassroom.id) || null;
    setSelectedSchedule(activeOrLatestSlot);
  }, [selectedClassroom, liveModel]);

  const selectedClassroomLiveState = selectedClassroom
    ? liveModel.classroomStateMap.get(selectedClassroom.id) || "FREE"
    : "FREE";

  const teacherSearchRows = useMemo(() => {
    const query = searchTeacher.trim();
    if (!query) return [];

    const now = Date.now();
    return teachers
      .filter((teacher) => isTeacherNameMatch(teacher.name, query))
      .map((teacher) => {
        const teacherSlots = schedules
          .filter((slot) => slot.teacher_user_id === teacher.user_id)
          .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());

        const active = teacherSlots.find((slot) => {
          const start = new Date(slot.slot_start).getTime();
          const end = new Date(slot.slot_end).getTime();
          return now >= start && now < end;
        });

        const upcoming = teacherSlots.find((slot) => new Date(slot.slot_start).getTime() > now);
        const slot = active || upcoming || null;
        const classroom = slot ? classrooms.find((room) => room.id === slot.classroom_id) : null;
        const block = classroom ? blocks.find((b) => b.id === classroom.block_id) : null;

        let status = "Free";
        if (active && active.confirmed_at) status = "In Class";
        else if (active || upcoming) status = "Scheduled";

        return {
          teacher,
          status,
          slot,
          classroom,
          block,
          endTime: active ? new Date(active.slot_end).toLocaleTimeString() : null,
        };
      });
  }, [searchTeacher, teachers, schedules, classrooms, blocks]);

  const navigatorTeacherResults = useMemo(() => {
    const query = navigatorTeacherQuery.trim();
    if (!query) return [];

    const filtered = classroomAllocations.filter((row) =>
      isTeacherNameMatch(row.allocated_staff, query)
    );

    const uniqueRows = filtered.filter((row, index, arr) => {
      const dedupeKey = `${row.allocated_staff}-${row.classroom_id}-${row.time_start}-${row.time_end}`;
      return (
        arr.findIndex(
          (item) =>
            `${item.allocated_staff}-${item.classroom_id}-${item.time_start}-${item.time_end}` === dedupeKey
        ) === index
      );
    });

    return uniqueRows.slice(0, 6);
  }, [navigatorTeacherQuery, classroomAllocations]);

  const teacherNameSuggestions = useMemo(() => {
    const names = [...new Set(teachers.map((teacher) => teacher.name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
    const query = navigatorTeacherQuery.trim();
    if (!query) return [];
    return names.filter((name) => isTeacherNameMatch(name, query)).slice(0, 8);
  }, [teachers, navigatorTeacherQuery]);

  const focusTeacherInNavigator = (allocation: ClassroomAllocation) => {
    setNavigatorTeacherQuery(allocation.allocated_staff);

    const targetTourIndex = classroomTour.findIndex(
      (step) => step.buildingId === allocation.building_id
    );
    if (targetTourIndex >= 0) {
      setClassroomTourIndex(targetTourIndex);
    }
  };

  const allocationTimeOptions = useMemo(() => {
    const options = new Set<string>();
    classroomAllocations.forEach((allocation) => {
      options.add(`${allocation.time_start} - ${allocation.time_end}`);
    });
    return Array.from(options).sort();
  }, [classroomAllocations]);

  const visibleAllocations = useMemo(() => {
    if (allocationTimeFilter === "all") return classroomAllocations;
    return classroomAllocations.filter(
      (allocation) => `${allocation.time_start} - ${allocation.time_end}` === allocationTimeFilter
    );
  }, [classroomAllocations, allocationTimeFilter]);

  const canConfirmPresence =
    !!selectedSchedule && !!user && (selectedSchedule.teacher_user_id === user.id || isAdmin());
  const canMarkOffsite = !!user && isAdmin();

  const sessionArchive = useMemo(() => {
    return buildMockArchive(
      schedules.map(normalizeSchedule),
      teachers,
      currentTime
    );
  }, [schedules, teachers, currentTime, mockScheduleOverrides]);

  const runSessionArchive = async (slot: ScheduleSlot, status: string) => {
    try {
      const teacher = getTeacher(slot.teacher_user_id);
      const classroom = classrooms.find((c) => c.id === slot.classroom_id);
      if (!classroom) return;

      await supabase.from("classroom_session_logs").insert({
        schedule_slot_id: slot.id,
        classroom_id: classroom.id,
        teacher_user_id: slot.teacher_user_id,
        teacher_name: teacher?.name || "Unknown",
        department: slot.department || teacher?.department || null,
        section: slot.section,
        session_start: slot.slot_start,
        session_end: slot.slot_end,
        session_status: status,
        offsite_flag: status === "OFFSITE",
        attendance_ref: slot.attendance_url,
        archived_at: new Date().toISOString(),
      });
    } catch (error) {
      // Keep archive insertion best-effort to avoid blocking primary workflow.
      console.warn("Session archive insert skipped:", error);
    }
  };

  const handleConfirmPresence = async () => {
    if (!selectedSchedule || !user) return;

    setIsSavingScheduleAction(true);
    try {
      if (simulationMode) {
        const nowIso = new Date().toISOString();
        setSchedules((prev) =>
          withMockConfirmation(prev, selectedSchedule.classroom_id, new Date(nowIso))
        );
        setMockScheduleOverrides((prev) => ({
          ...prev,
          [selectedSchedule.id]: {
            ...selectedSchedule,
            confirmed_at: nowIso,
            confirmed_by: user.id,
            session_status: "OCCUPIED",
          },
        }));

        toast({
          title: "Presence Confirmed",
          description: "Mock classroom status updated to OCCUPIED.",
        });

        setIsSavingScheduleAction(false);
        return;
      }

      const nowIso = new Date().toISOString();

      const { error: scheduleError } = await supabase
        .from("classroom_schedule_slots")
        .update({
          confirmed_at: nowIso,
          confirmed_by: user.id,
          session_status: "OCCUPIED",
        })
        .eq("id", selectedSchedule.id);

      if (scheduleError) {
        if (isMissingScheduleTableError(scheduleError)) {
          setIsScheduleTableAvailable(false);
          setSchedules((prev) =>
            prev.map((slot) =>
              slot.id === selectedSchedule.id
                ? {
                    ...slot,
                    confirmed_at: nowIso,
                    confirmed_by: user.id,
                    session_status: "OCCUPIED",
                  }
                : slot
            )
          );
        } else {
          throw scheduleError;
        }
      }

      await supabase
        .from("classrooms")
        .update({ status: "occupied", updated_at: nowIso })
        .eq("id", selectedSchedule.classroom_id);

      await supabase.from("classroom_attendance").insert({
        classroom_id: selectedSchedule.classroom_id,
        teacher_id: selectedSchedule.teacher_user_id,
        marked_in_at: nowIso,
        status: "occupied",
      });

      toast({
        title: "Presence Confirmed",
        description: "Classroom status updated to OCCUPIED.",
      });

      await refreshData();
    } catch (error) {
      console.error("Failed to confirm presence:", error);
      toast({
        title: "Error",
        description: "Unable to confirm presence for this slot.",
        variant: "destructive",
      });
    } finally {
      setIsSavingScheduleAction(false);
    }
  };

  const handleMarkOffsite = async () => {
    if (!selectedSchedule || !user) return;

    setIsSavingScheduleAction(true);
    try {
      if (simulationMode) {
        const nowIso = new Date().toISOString();
        setMockScheduleOverrides((prev) => ({
          ...prev,
          [selectedSchedule.id]: {
            ...selectedSchedule,
            offsite_marked_at: nowIso,
            offsite_marked_by: user.id,
            offsite_reason: offsiteReason,
            session_status: "OFFSITE",
          },
        }));

        toast({
          title: "Offsite Updated",
          description: "Mock session marked as OFFSITE and classroom released.",
        });

        setIsSavingScheduleAction(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const { error: scheduleError } = await supabase
        .from("classroom_schedule_slots")
        .update({
          offsite_marked_at: nowIso,
          offsite_marked_by: user.id,
          offsite_reason: offsiteReason,
          session_status: "OFFSITE",
        })
        .eq("id", selectedSchedule.id);

      if (scheduleError) throw scheduleError;

      await supabase
        .from("classrooms")
        .update({ status: "available", updated_at: nowIso })
        .eq("id", selectedSchedule.classroom_id);

      await runSessionArchive(selectedSchedule, "OFFSITE");

      toast({
        title: "Offsite Updated",
        description: "Session marked as OFFSITE and classroom released.",
      });

      await refreshData();
    } catch (error) {
      console.error("Failed to mark offsite:", error);
      toast({
        title: "Error",
        description: "Unable to mark this session as offsite.",
        variant: "destructive",
      });
    } finally {
      setIsSavingScheduleAction(false);
    }
  };

  const handleAdminBookClassroom = async (classroom: Classroom) => {
    if (!user) return;
    setIsSavingScheduleAction(true);
    try {
      const referenceNow = simulationMode ? new Date(currentTime) : new Date();
      const bookingPeriod = resolveBookingPeriod(referenceNow);
      if (!bookingPeriod) {
        toast({
          title: "Booking unavailable",
          description: "Bookings are allowed only during class periods (not during break/lunch or outside timetable).",
          variant: "destructive",
        });
        return;
      }

      const nowIso = bookingPeriod.slotStart.toISOString();
      const slotEnd = bookingPeriod.slotEnd.toISOString();

      if (simulationMode) {
        const mockSlot: ScheduleSlot = {
          id: `mock-${classroom.id}-${Date.now()}`,
          classroom_id: classroom.id,
          teacher_user_id: user.id,
          subject: "Pickup Class",
          department: user.department || null,
          section: "Ad-hoc",
          slot_start: nowIso,
          slot_end: slotEnd,
          session_status: "OCCUPIED",
          confirmed_at: nowIso,
          confirmed_by: user.id,
          offsite_marked_at: null,
          offsite_marked_by: null,
          offsite_reason: null,
          attendance_url: null,
        };

        setSchedules((prev) => [...prev, mockSlot]);
        toast({
          title: "Classroom Booked",
          description: `${getClassroomCode(classroom)} booked for period ${bookingPeriod.label} in simulation mode.`,
        });
        setIsSavingScheduleAction(false);
        return;
      }

      const applyLegacyBookingFallback = async () => {
        const legacySlot: ScheduleSlot = {
          id: `legacy-${classroom.id}-${Date.now()}`,
          classroom_id: classroom.id,
          teacher_user_id: user.id,
          subject: "Pickup Class",
          department: user.department || null,
          section: "Ad-hoc",
          slot_start: nowIso,
          slot_end: slotEnd,
          session_status: "OCCUPIED",
          confirmed_at: nowIso,
          confirmed_by: user.id,
          offsite_marked_at: null,
          offsite_marked_by: null,
          offsite_reason: null,
          attendance_url: null,
        };

        setSchedules((prev) => [...prev, legacySlot]);
        setClassrooms((prev) =>
          prev.map((item) => (item.id === classroom.id ? { ...item, status: "occupied" } : item))
        );

        const { error: classroomUpdateError } = await supabase
          .from("classrooms")
          .update({ status: "occupied", updated_at: nowIso })
          .eq("id", classroom.id);

        if (classroomUpdateError) {
          console.warn("Legacy booking classroom update skipped:", classroomUpdateError);
        }

        const { error: attendanceError } = await supabase.from("classroom_attendance").insert({
          classroom_id: classroom.id,
          teacher_id: user.id,
          marked_in_at: nowIso,
          status: "occupied",
        });

        if (attendanceError) {
          console.warn("Legacy booking attendance insert skipped:", attendanceError);
        }

        toast({
          title: "Classroom Booked",
          description: `${getClassroomCode(classroom)} booked for period ${bookingPeriod.label} (legacy mode).`,
        });
      };

      if (!isScheduleTableAvailable) {
        await applyLegacyBookingFallback();
        return;
      }

      const { error: slotError } = await supabase
        .from("classroom_schedule_slots")
        .insert({
          classroom_id: classroom.id,
          teacher_user_id: user.id,
          subject: "Pickup Class",
          department: user.department || null,
          section: "Ad-hoc",
          slot_start: nowIso,
          slot_end: slotEnd,
          session_status: "OCCUPIED",
          confirmed_at: nowIso,
          confirmed_by: user.id,
        });

      if (slotError) {
        if (isMissingScheduleTableError(slotError)) {
          setIsScheduleTableAvailable(false);
          await applyLegacyBookingFallback();
          return;
        }

        throw new Error(
          [
            slotError.message,
            slotError.details,
            slotError.hint,
            slotError.code ? `code: ${slotError.code}` : undefined,
          ]
            .filter(Boolean)
            .join(" | ")
        );
      }

      const { error: classroomUpdateError } = await supabase
        .from("classrooms")
        .update({ status: "occupied" })
        .eq("id", classroom.id);

      if (classroomUpdateError) {
        console.warn("Classroom status update skipped:", classroomUpdateError);
      }

      const { error: attendanceError } = await supabase.from("classroom_attendance").insert({
        classroom_id: classroom.id,
        teacher_id: user.id,
        marked_in_at: nowIso,
        status: "occupied",
      });

      if (attendanceError) {
        console.warn("Attendance insert skipped:", attendanceError);
      }

      toast({
        title: "Classroom Booked",
        description: `${getClassroomCode(classroom)} booked for period ${bookingPeriod.label}.`,
      });

      await refreshData();
    } catch (error) {
      console.error("Failed to book classroom:", error);
      toast({
        title: "Booking Failed",
        description: getActionErrorMessage(error, "Unable to book the classroom. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSavingScheduleAction(false);
    }
  };

  const releaseBookedSlot = async (
    targetClassroom: Classroom,
    targetSlot: ScheduleSlot,
    reason: "auto" | "manual"
  ) => {
    const nowIso = new Date().toISOString();

    if (simulationMode || !isScheduleTableAvailable) {
      setSchedules((prev) =>
        prev.map((slot) =>
          slot.id === targetSlot.id
            ? {
                ...slot,
                session_status: "SESSION_COMPLETED",
                offsite_marked_at: nowIso,
                confirmed_at: null,
                confirmed_by: null,
              }
            : slot
        )
      );

      setClassrooms((prev) =>
        prev.map((item) => (item.id === targetClassroom.id ? { ...item, status: "available" } : item))
      );

      await supabase
        .from("classrooms")
        .update({ status: "available", updated_at: nowIso })
        .eq("id", targetClassroom.id);

      await supabase
        .from("classroom_attendance")
        .update({ marked_out_at: nowIso, status: "available" })
        .eq("classroom_id", targetClassroom.id)
        .is("marked_out_at", null);

      return;
    }

    const { error: scheduleError } = await supabase
      .from("classroom_schedule_slots")
      .update({
        session_status: "SESSION_COMPLETED",
        offsite_marked_at: nowIso,
        offsite_reason: reason === "manual" ? "Unbooked by admin" : "Auto-release at period end",
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq("id", targetSlot.id);

    if (scheduleError) {
      if (isMissingScheduleTableError(scheduleError)) {
        setIsScheduleTableAvailable(false);
        await releaseBookedSlot(targetClassroom, targetSlot, reason);
        return;
      }

      throw new Error(
        [
          scheduleError.message,
          scheduleError.details,
          scheduleError.hint,
          scheduleError.code ? `code: ${scheduleError.code}` : undefined,
        ]
          .filter(Boolean)
          .join(" | ")
      );
    }

    await supabase
      .from("classrooms")
      .update({ status: "available", updated_at: nowIso })
      .eq("id", targetClassroom.id);

    await supabase
      .from("classroom_attendance")
      .update({ marked_out_at: nowIso, status: "available" })
      .eq("classroom_id", targetClassroom.id)
      .is("marked_out_at", null);
  };

  useEffect(() => {
    if (!isAdmin()) return;

    const nowMs = currentTime.getTime();
    const expiredBookedSlots = schedules
      .map(normalizeSchedule)
      .filter((slot) => slot.session_status === "OCCUPIED")
      .filter((slot) => new Date(slot.slot_end).getTime() <= nowMs)
      .filter((slot) => slot.subject === "Pickup Class" || slot.section === "Ad-hoc");

    if (expiredBookedSlots.length === 0) return;

    const releaseExpired = async () => {
      for (const slot of expiredBookedSlots) {
        const classroom = classrooms.find((item) => item.id === slot.classroom_id);
        if (!classroom) continue;

        try {
          await releaseBookedSlot(classroom, slot, "auto");
        } catch (error) {
          console.error("Failed to auto-release booked classroom:", error);
        }
      }

      if (!simulationMode && isScheduleTableAvailable) {
        await refreshData();
      }
    };

    releaseExpired();
  }, [currentTime, schedules, classrooms, simulationMode, isScheduleTableAvailable]);

  const handleFloorVisualizerAdminAction = async (payload: {
    action: "book" | "takeover" | "unbook";
    buildingId: string;
    floorNumber: number;
    roomNumber: number;
    allocation?: ClassroomAllocation;
  }) => {
    if (!user || !isAdmin()) return;

    const resolveClassroomFromPayload = () => {
      const allocationClassroom =
        payload.allocation?.classroom_id
          ? classrooms.find((classroom) => classroom.id === payload.allocation?.classroom_id)
          : null;

      if (allocationClassroom) return allocationClassroom;

      const expectedCompositeRoom = payload.floorNumber * 100 + payload.roomNumber;
      const expectedBlockCode = payload.buildingId.toUpperCase();

      return (
        classrooms.find((classroom) => {
          const blockCode = getBlockCode(classroom.block_id).toUpperCase();
          if (blockCode !== expectedBlockCode) return false;

          const directRoomMatch = classroom.classroom_number === payload.roomNumber;
          const compositeRoomMatch = classroom.classroom_number === expectedCompositeRoom;
          if (!directRoomMatch && !compositeRoomMatch) return false;

          const directFloorMatch = classroom.floor_number === payload.floorNumber;
          const inferredFloor = Math.floor(classroom.classroom_number / 100);
          const inferredFloorMatch = classroom.classroom_number >= 100 && inferredFloor === payload.floorNumber;

          return directFloorMatch || inferredFloorMatch;
        }) || null
      );
    };

    const targetClassroom = resolveClassroomFromPayload();

    if (!targetClassroom) {
      toast({
        title: "Classroom not found",
        description: `Unable to resolve ${payload.buildingId}-${payload.floorNumber}${String(payload.roomNumber).padStart(2, "0")}.`,
        variant: "destructive",
      });
      return;
    }

    if (payload.action === "book") {
      await handleAdminBookClassroom(targetClassroom);
      return;
    }

    const nowMs = currentTime.getTime();
    const normalizedSlots = schedules.map(normalizeSchedule);
    let targetSlot = normalizedSlots.find((slot) => {
      if (slot.classroom_id !== targetClassroom.id) return false;
      if (slot.offsite_marked_at || slot.session_status === "OFFSITE") return false;
      const startMs = new Date(slot.slot_start).getTime();
      const endMs = new Date(slot.slot_end).getTime();
      return nowMs >= startMs && nowMs < endMs;
    });

    // Fallback: allow takeover on the nearest scheduled slot for this classroom.
    if (!targetSlot) {
      targetSlot = normalizedSlots
        .filter((slot) => slot.classroom_id === targetClassroom.id)
        .filter((slot) => !slot.offsite_marked_at && slot.session_status !== "OFFSITE")
        .sort((a, b) => Math.abs(new Date(a.slot_start).getTime() - nowMs) - Math.abs(new Date(b.slot_start).getTime() - nowMs))[0];
    }

    if (!targetSlot) {
      toast({
        title: "No active allocation",
        description: "This classroom does not have an active session to take over.",
      });
      return;
    }

    if (payload.action === "unbook") {
      if (targetSlot.teacher_user_id !== user.id) {
        toast({
          title: "Unbook not allowed",
          description: "Only the admin who booked this classroom can unbook it.",
          variant: "destructive",
        });
        return;
      }

      setIsSavingScheduleAction(true);
      try {
        await releaseBookedSlot(targetClassroom, targetSlot, "manual");

        toast({
          title: "Classroom Unbooked",
          description: `${getClassroomCode(targetClassroom)} is now available.`,
        });

        if (!simulationMode && isScheduleTableAvailable) {
          await refreshData();
        }
      } catch (error) {
        console.error("Failed to unbook classroom:", error);
        toast({
          title: "Unbook Failed",
          description: getActionErrorMessage(error, "Unable to unbook this classroom."),
          variant: "destructive",
        });
      } finally {
        setIsSavingScheduleAction(false);
      }
      return;
    }

    if (targetSlot.confirmed_at || targetSlot.session_status === "OCCUPIED") {
      toast({
        title: "Already occupied",
        description: "This classroom session is already marked as occupied.",
      });
      return;
    }

    setIsSavingScheduleAction(true);
    try {
      if (simulationMode) {
        const nowIso = new Date().toISOString();
        setSchedules((prev) => withMockConfirmation(prev, targetSlot.classroom_id, new Date(nowIso)));
        setMockScheduleOverrides((prev) => ({
          ...prev,
          [targetSlot.id]: {
            ...targetSlot,
            confirmed_at: nowIso,
            confirmed_by: user.id,
            session_status: "OCCUPIED",
          },
        }));

        toast({
          title: "Presence Marked",
          description: `${getClassroomCode(targetClassroom)} marked as occupied by takeover.`,
        });

        return;
      }

      const nowIso = new Date().toISOString();
      const applyLegacyTakeoverFallback = async () => {
        setSchedules((prev) =>
          prev.map((slot) =>
            slot.id === targetSlot.id
              ? {
                  ...slot,
                  confirmed_at: nowIso,
                  confirmed_by: user.id,
                  session_status: "OCCUPIED",
                }
              : slot
          )
        );

        setClassrooms((prev) =>
          prev.map((item) => (item.id === targetClassroom.id ? { ...item, status: "occupied" } : item))
        );

        await supabase
          .from("classrooms")
          .update({ status: "occupied", updated_at: nowIso })
          .eq("id", targetClassroom.id);

        await supabase.from("classroom_attendance").insert({
          classroom_id: targetClassroom.id,
          teacher_id: user.id,
          marked_in_at: nowIso,
          status: "occupied",
        });
      };
      const { error: scheduleError } = await supabase
        .from("classroom_schedule_slots")
        .update({
          confirmed_at: nowIso,
          confirmed_by: user.id,
          session_status: "OCCUPIED",
        })
        .eq("id", targetSlot.id);

      if (scheduleError) {
        if (isMissingScheduleTableError(scheduleError)) {
          setIsScheduleTableAvailable(false);
          await applyLegacyTakeoverFallback();
          return;
        }

        throw new Error(
          [
            scheduleError.message,
            scheduleError.details,
            scheduleError.hint,
            scheduleError.code ? `code: ${scheduleError.code}` : undefined,
          ]
            .filter(Boolean)
            .join(" | ")
        );
      }

      await supabase
        .from("classrooms")
        .update({ status: "occupied", updated_at: nowIso })
        .eq("id", targetSlot.classroom_id);

      await supabase.from("classroom_attendance").insert({
        classroom_id: targetSlot.classroom_id,
        teacher_id: user.id,
        marked_in_at: nowIso,
        status: "occupied",
      });

      toast({
        title: "Presence Marked",
        description: `${getClassroomCode(targetClassroom)} takeover marked successfully.`,
      });

      await refreshData();
    } catch (error) {
      console.error("Failed to mark takeover presence:", error);
      toast({
        title: "Update Failed",
        description: getActionErrorMessage(error, "Unable to mark takeover presence for this classroom."),
        variant: "destructive",
      });
    } finally {
      setIsSavingScheduleAction(false);
    }
  };

  const handleTakeAttendance = () => {
    navigate("/attendance");
  };

  // Legacy attendance mark in/out workflow.
  const handleMarkAttendance = async () => {
    if (!selectedClassroom || !user) return;

    setIsMarking(true);
    try {
      if (simulationMode) {
        setClassroomStatus((prev) =>
          prev
            ? { ...prev, marked_out_at: prev.marked_out_at ? null : new Date().toISOString() }
            : {
                id: `mock-attendance-${selectedClassroom.id}`,
                classroom_id: selectedClassroom.id,
                teacher_id: user.id,
                marked_in_at: new Date().toISOString(),
                marked_out_at: null,
                status: "occupied",
              }
        );

        toast({
          title: "Simulation Updated",
          description: "Local attendance state updated for the classroom demo.",
        });

        setIsMarking(false);
        return;
      }

      const { data: existing } = await supabase
        .from("classroom_attendance")
        .select("*")
        .eq("classroom_id", selectedClassroom.id)
        .eq("teacher_id", user.id)
        .is("marked_out_at", null)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("classroom_attendance")
          .update({
            marked_out_at: new Date().toISOString(),
            status: "available",
          })
          .eq("id", existing.id);

        if (error) throw error;

        await supabase
          .from("classrooms")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .eq("id", selectedClassroom.id);

        toast({
          title: "Success",
          description: "Marked out of classroom",
        });
      } else {
        const { error } = await supabase.from("classroom_attendance").insert({
          classroom_id: selectedClassroom.id,
          teacher_id: user.id,
          status: "occupied",
        });

        if (error) throw error;

        await supabase
          .from("classrooms")
          .update({ status: "occupied", updated_at: new Date().toISOString() })
          .eq("id", selectedClassroom.id);

        toast({
          title: "Success",
          description: "Marked in classroom",
        });
      }

      const { data: updated } = await supabase
        .from("classroom_attendance")
        .select("*")
        .eq("classroom_id", selectedClassroom.id)
        .is("marked_out_at", null)
        .maybeSingle();

      setClassroomStatus(updated);
      await refreshData();
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setIsMarking(false);
    }
  };

  // Render 3D navigator mode.
  useEffect(() => {
    if (!canvasRef.current || blocks.length === 0 || mode !== "navigator") return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 20, 80);

    const camera = new THREE.PerspectiveCamera(
      55,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      300
    );
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 4, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambientLight = new THREE.AmbientLight(0xc9d4ff, 0.45);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
    directionalLight.position.set(18, 24, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x86a6ff, 0.35);
    fillLight.position.set(-12, 10, -12);
    scene.add(fillLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x16203a, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const visibleBlocks =
      selectedBlock === "all" ? blocks : blocks.filter((block) => block.id === selectedBlock);
    const activeFloor = selectedFloor === "all" ? null : Number(selectedFloor);

    const spacing = 13;
    const totalWidth = (visibleBlocks.length - 1) * spacing;

    const getStatusColor = (state: LiveClassroomState) => {
      if (state === "OCCUPIED") return 0xef4444;
      if (state === "UNATTENDED") return 0xeab308;
      if (state === "SCHEDULED") return 0x3b82f6;
      if (state === "OFFSITE") return 0x8b5cf6;
      if (state === "SESSION_COMPLETED") return 0x64748b;
      return 0x22c55e;
    };

    const getPerimeterPosition = (index: number, total: number, width: number, depth: number) => {
      const safeTotal = Math.max(total, 1);
      const perimeter = 2 * (width + depth);
      const distance = (index / safeTotal) * perimeter;
      const halfW = width / 2;
      const halfD = depth / 2;

      if (distance < width) {
        return { x: -halfW + distance, z: -halfD };
      }
      if (distance < width + depth) {
        return { x: halfW, z: -halfD + (distance - width) };
      }
      if (distance < 2 * width + depth) {
        return { x: halfW - (distance - (width + depth)), z: halfD };
      }
      return { x: -halfW, z: halfD - (distance - (2 * width + depth)) };
    };

    const getLinearPosition = (index: number, total: number) => {
      const safeTotal = Math.max(total, 1);
      const spacingLinear = 1.45;
      const startX = -((safeTotal - 1) * spacingLinear) / 2;
      return { x: startX + index * spacingLinear, z: 0 };
    };

    const makeRoomLabel = (labelText: string) => {
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const ctx = labelCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 254, 62);
      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, 128, 32);

      const texture = new THREE.CanvasTexture(labelCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1.6, 0.4, 1);
      return sprite;
    };

    const clickableMeshes: THREE.Mesh[] = [];
    const blockCenterById = new Map<string, number>();
    const classroomWorldPositions = new Map<string, THREE.Vector3>();
    const floorCenterByKey = new Map<string, THREE.Vector3>();

    visibleBlocks.forEach((block, blockIndex) => {
      const isSquare = block.name.toLowerCase().includes("block a") || block.shape === "square";
      const footprint = isSquare ? { width: 6.8, depth: 6.8 } : { width: 10.5, depth: 4.2 };
      const blockX = blockIndex * spacing - totalWidth / 2;
      blockCenterById.set(block.id, blockX);

      const blockGroup = new THREE.Group();
      blockGroup.position.set(blockX, 0, 0);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(footprint.width + 1.2, 0.38, footprint.depth + 1.2),
        new THREE.MeshStandardMaterial({ color: 0x253252, roughness: 0.8, metalness: 0.2 })
      );
      base.position.y = 0.19;
      base.receiveShadow = true;
      blockGroup.add(base);

      const blockFloors = floors
        .filter((f) => f.block_id === block.id)
        .sort((a, b) => a.floor_number - b.floor_number);

      const floorHeight = 1.35;
      const slabHeight = 0.12;

      blockFloors.forEach((floor) => {
        if (activeFloor !== null && floor.floor_number !== activeFloor) return;

        const floorBaseY = 0.38 + (floor.floor_number - 1) * floorHeight;

        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(footprint.width, slabHeight, footprint.depth),
          new THREE.MeshStandardMaterial({ color: 0x3b4c78, roughness: 0.78, metalness: 0.18 })
        );
        slab.position.y = floorBaseY;
        slab.receiveShadow = true;
        blockGroup.add(slab);

        const core = new THREE.Mesh(
          new THREE.BoxGeometry(footprint.width - 0.8, floorHeight - 0.25, footprint.depth - 0.8),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.85,
            metalness: 0.05,
            transparent: true,
            opacity: 0.35,
          })
        );
        core.position.y = floorBaseY + (floorHeight - 0.25) / 2;
        blockGroup.add(core);

        const floorClassrooms = classrooms
          .filter((c) => c.block_id === block.id && c.floor_number === floor.floor_number)
          .sort((a, b) => a.classroom_number - b.classroom_number);

        // Use the center classroom position as floor reference target.
        if (floorClassrooms.length > 0) {
          const midIndex = Math.floor(floorClassrooms.length / 2);
          const roomCount = floorClassrooms.length;
          const { x: centerX, z: centerZ } = isSquare
            ? getPerimeterPosition(
                midIndex,
                roomCount,
                footprint.width - 1.25,
                footprint.depth - 1.25
              )
            : getLinearPosition(midIndex, roomCount);

          floorCenterByKey.set(
            `${block.id}-${floor.floor_number}`,
            new THREE.Vector3(blockX + centerX, floorBaseY + 0.6, centerZ)
          );
        }

        floorClassrooms.forEach((classroom, roomIndex) => {
          if (navigatorScope === "classroom" && selectedClassroom && classroom.id !== selectedClassroom.id) {
            return;
          }

          const roomCount = floorClassrooms.length;
          const { x, z } = isSquare
            ? getPerimeterPosition(
                roomIndex,
                roomCount,
                footprint.width - 1.25,
                footprint.depth - 1.25
              )
            : getLinearPosition(roomIndex, roomCount);

          const liveState = liveModel.classroomStateMap.get(classroom.id) || "FREE";
          const roomColor = getStatusColor(liveState);
          const roomSize = navigatorScope === "classroom" ? 1.8 : 1.25;
          const roomHeight = navigatorScope === "classroom" ? 1.35 : 1.05;

          const room = new THREE.Mesh(
            new THREE.BoxGeometry(roomSize, roomHeight, roomSize),
            new THREE.MeshStandardMaterial({
              color: roomColor,
              emissive: roomColor,
              emissiveIntensity: 0.2,
              roughness: 0.5,
              metalness: 0.15,
            })
          );

          room.position.set(x, floorBaseY + (navigatorScope === "classroom" ? 0.82 : 0.6), z);
          room.castShadow = true;
          room.receiveShadow = true;
          room.userData = { classroom };
          clickableMeshes.push(room);
          blockGroup.add(room);

          classroomWorldPositions.set(
            classroom.id,
            new THREE.Vector3(blockX + x, floorBaseY + 0.6, z)
          );

          const roomLabel = makeRoomLabel(getClassroomCode(classroom));
          if (roomLabel) {
            roomLabel.position.set(x, floorBaseY + (navigatorScope === "classroom" ? 2.08 : 1.42), z);
            blockGroup.add(roomLabel);
          }
        });
      });

      scene.add(blockGroup);
    });

    const scopePreset =
      navigatorScope === "classroom"
        ? { x: -0.18, y: 0.36, radius: 6.8 }
        : navigatorScope === "floor"
          ? { x: -0.42, y: 0.16, radius: 8.8 }
          : { x: -0.26, y: 0, radius: 20 };

    const controls = {
      isDragging: false,
      moved: false,
      previousMousePosition: { x: 0, y: 0 },
      rotation: { x: scopePreset.x, y: scopePreset.y },
      radius: scopePreset.radius,
    };

    const orbitTarget = new THREE.Vector3(0, 3.2, 0);

    if (selectedBlock !== "all" && blockCenterById.has(selectedBlock)) {
      orbitTarget.x = blockCenterById.get(selectedBlock) || 0;
    }

    if (selectedFloor !== "all") {
      orbitTarget.y = 0.8 + (Number(selectedFloor) - 1) * 1.35;
    }

    if (
      navigatorScope === "floor" &&
      selectedBlock !== "all" &&
      blockCenterById.has(selectedBlock)
    ) {
      const floorKey = `${selectedBlock}-${selectedFloor}`;
      const floorCenter = floorCenterByKey.get(floorKey);
      if (floorCenter) {
        orbitTarget.copy(floorCenter);
      } else {
        orbitTarget.x = blockCenterById.get(selectedBlock) || 0;
      }
    }

    if (
      navigatorScope === "classroom" &&
      selectedClassroom &&
      classroomWorldPositions.has(selectedClassroom.id)
    ) {
      const roomPos = classroomWorldPositions.get(selectedClassroom.id);
      if (roomPos) {
        orbitTarget.copy(roomPos);
        orbitTarget.y += 0.35;
        controls.radius = 6.8;
      }
    }

    const updateCamera = () => {
      const pitch = controls.rotation.x;
      const yaw = controls.rotation.y;
      const x = controls.radius * Math.sin(yaw) * Math.cos(pitch);
      const y = controls.radius * Math.sin(pitch) + 6;
      const z = controls.radius * Math.cos(yaw) * Math.cos(pitch);
      camera.position.set(x, Math.max(2.8, y), z);
      camera.lookAt(orbitTarget);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent) => {
      if (navigatorScope === "classroom") return;
      controls.isDragging = true;
      controls.moved = false;
      controls.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (navigatorScope === "classroom") return;
      if (!controls.isDragging) return;

      const deltaX = e.clientX - controls.previousMousePosition.x;
      const deltaY = e.clientY - controls.previousMousePosition.y;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        controls.moved = true;
      }

      controls.rotation.y += deltaX * 0.005;
      controls.rotation.x += deltaY * 0.005;
      controls.rotation.x = Math.max(-0.45, Math.min(0.6, controls.rotation.x));

      updateCamera();
      controls.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      controls.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (navigatorScope === "classroom") return;
      e.preventDefault();
      controls.radius += e.deltaY * 0.015;
      controls.radius = Math.max(6, Math.min(42, controls.radius));
      updateCamera();
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (controls.moved) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes, false);

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        const classroom = object.userData.classroom as Classroom | undefined;
        if (classroom) {
          setSelectedClassroom(classroom);
          setShowDetails(true);
        }
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("click", onMouseClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("click", onMouseClick);
      canvas.removeEventListener("wheel", onWheel);

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }

        const material = (mesh.material || null) as
          | THREE.Material
          | THREE.Material[]
          | null;

        if (Array.isArray(material)) {
          material.forEach((mat) => {
            const spriteMat = mat as THREE.SpriteMaterial;
            if (spriteMat.map) {
              spriteMat.map.dispose();
            }
            mat.dispose();
          });
        } else if (material) {
          const spriteMat = material as THREE.SpriteMaterial;
          if (spriteMat.map) {
            spriteMat.map.dispose();
          }
          material.dispose();
        }
      });

      renderer.dispose();
    };
  }, [
    blocks,
    classrooms,
    floors,
    liveModel,
    mode,
    navigatorScope,
    selectedBlock,
    selectedFloor,
    selectedClassroom,
  ]);

  const selectedTeacher = getTeacher(selectedSchedule?.teacher_user_id);

  useEffect(() => {
    const handleTopTeacherSearch = (event: Event) => {
      const customEvent = event as CustomEvent<{ name?: string }>;
      const teacherName = customEvent.detail?.name?.trim();
      if (!teacherName) return;
      setNavigatorTeacherQuery(teacherName);
    };

    window.addEventListener("rit:teacher-search", handleTopTeacherSearch as EventListener);
    return () => {
      window.removeEventListener("rit:teacher-search", handleTopTeacherSearch as EventListener);
    };
  }, []);

  useEffect(() => {
    const step = classroomTour[classroomTourIndex];
    if (!step.buildingId) {
      setFloorDetectionBuilding("dummy");
      return;
    }

    setFloorDetectionBuilding(step.buildingId);
  }, [classroomTour, classroomTourIndex]);

  useEffect(() => {
    setFloorTourIndex(0);
  }, [floorDetectionBuilding]);

  useEffect(() => {
    const safeIndex = Math.max(0, Math.min(floorTourIndex, floorTourSteps.length - 1));
    setFloorDetectionFloor(floorTourSteps[safeIndex]?.value ?? -1);
  }, [floorTourIndex, floorTourSteps]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6" />
        <h1 className="text-3xl font-bold">3D Campus Navigator</h1>
        <div className="ml-auto flex items-center gap-2">
          <Badge className={simulationMode ? "bg-violet-600" : "bg-slate-500"}>
            {simulationMode ? "Simulation Mode" : "Live Mode"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => setSimulationMode((prev) => !prev)}
          >
            {simulationMode ? "Switch to Live" : "Enable Simulation"}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Current Clock</p>
            <p className="text-lg font-semibold">{currentTime.toLocaleString()}</p>
          </div>
          <div className="text-sm text-muted-foreground max-w-3xl">
            {simulationMode
              ? "Simulation is running at 1 minute per second. Classroom states advance automatically from the mock timetable."
              : "Live mode uses the current system clock and syncs classroom status from the server when available."}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <p className="text-sm font-semibold">Teacher Locator</p>
          </div>

          <Input
            placeholder="Search teacher by name"
            value={navigatorTeacherQuery}
            onChange={(e) => setNavigatorTeacherQuery(e.target.value)}
          />

          {navigatorTeacherQuery.trim().length > 0 && teacherNameSuggestions.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-md border bg-background p-1">
              {teacherNameSuggestions.map((name) => (
                <button
                  type="button"
                  key={name}
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => setNavigatorTeacherQuery(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {navigatorTeacherQuery.trim().length > 0 && (
            <div className="space-y-2">
              {navigatorTeacherResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No teacher matched the current query.</p>
              )}

              {navigatorTeacherResults.map((row) => (
                <button
                  type="button"
                  key={`${row.classroom_id}-${row.teacher_user_id || row.allocated_staff}`}
                  className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() => focusTeacherInNavigator(row)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{row.allocated_staff}</p>
                    <Badge className="bg-blue-500">Block {row.building_id} / Room {row.room_number}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.subject} • {row.time_start} - {row.time_end}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          {/* 3D Floor Visualizer - Campus View */}
          <div className="relative rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900" style={{ height: "700px" }}>
            {floorDetectionBuilding !== "dummy" && (
              <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-md border border-slate-300/60 bg-slate-100/55 px-1 py-1.5 shadow-sm backdrop-blur-sm dark:border-slate-600/70 dark:bg-slate-900/45">
                <div className="flex min-w-[70px] flex-col items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setFloorTourIndex((current) => (current + 1) % floorTourSteps.length)}
                    aria-label="Go one floor up"
                    disabled={floorTourSteps.length <= 1}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>

                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">FL NO</p>
                    <p className="text-base font-semibold uppercase">
                      {floorTourSteps[Math.max(0, Math.min(floorTourIndex, floorTourSteps.length - 1))]?.label || "full"}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setFloorTourIndex((current) => (current - 1 + floorTourSteps.length) % floorTourSteps.length)}
                    aria-label="Go one floor down"
                    disabled={floorTourSteps.length <= 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 left-[calc((100%-436px)/2)] z-20 -translate-x-1/2 rounded-md border border-slate-300/60 bg-slate-100/55 px-2 py-1.5 shadow-sm backdrop-blur-sm dark:border-slate-600/70 dark:bg-slate-900/45">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setClassroomTourIndex((current) => (current - 1 + classroomTour.length) % classroomTour.length)}
                  aria-label="Previous classroom building"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <div className="text-center">
                  <p className="text-[10px] font-medium leading-none text-muted-foreground">BLOCK</p>
                  <p className="text-sm font-semibold uppercase leading-tight">
                    {blockDisplayLabel}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setClassroomTourIndex((current) => (current + 1) % classroomTour.length)}
                  aria-label="Next classroom building"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <FloorVisualizer
              buildingId={floorDetectionBuilding}
              floorNumber={floorDetectionFloor}
              allocations={classroomAllocations}
              externalTeacherQuery={navigatorTeacherQuery}
              isAdmin={isAdmin()}
              currentUserId={user?.id}
              onAdminRoomAction={handleFloorVisualizerAdminAction}
            />
          </div>
        </div>
      </Card>

      {/* Current Classroom Allocations */}
      {classroomAllocations.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Ongoing Class Sessions</h2>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground" htmlFor="allocation-time-filter">Time Slot</label>
              <select
                id="allocation-time-filter"
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                value={allocationTimeFilter}
                onChange={(e) => setAllocationTimeFilter(e.target.value)}
              >
                <option value="all">All Slots</option>
                {allocationTimeOptions.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {visibleAllocations.map((allocation) => (
              <div key={allocation.classroom_id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Block {allocation.building_id} - Room {allocation.room_number}</h3>
                  <Badge className={allocation.is_staff_present ? "bg-green-500" : "bg-red-500"}>
                    {allocation.is_staff_present ? "✓ Present" : "✗ Absent"}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Staff:</span>
                    <p className="font-medium">{allocation.allocated_staff}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <p className="font-medium">{allocation.subject}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Batch/Section:</span>
                    <p className="font-medium">{allocation.batch}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">{allocation.time_start} - {allocation.time_end}</p>
                  </div>

                  {!allocation.is_staff_present && allocation.substitute_staff && (
                    <div className="mt-2 rounded bg-amber-50 p-2 dark:bg-amber-900/20">
                      <p className="text-xs text-amber-900 dark:text-amber-200">
                        <strong>Substitute:</strong> {allocation.substitute_staff}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {visibleAllocations.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No allocations found for the selected time slot.
              </div>
            )}
          </div>
        </Card>
      )}

      {sessionArchive.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Session Archive</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {sessionArchive.slice(0, 8).map((entry) => (
              <div key={`${entry.classroom_id}-${entry.start_time}`} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{entry.classroom_id}</p>
                  <Badge className={entry.offsite_flag ? "bg-violet-500" : entry.session_status === "OCCUPIED" ? "bg-red-500" : entry.session_status === "UNATTENDED" ? "bg-yellow-500" : "bg-slate-500"}>
                    {entry.session_status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{entry.teacher_name}</p>
                <p className="text-sm text-muted-foreground">{entry.section || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{new Date(entry.start_time).toLocaleTimeString()} - {new Date(entry.end_time).toLocaleTimeString()}</p>
                <p className="text-xs text-muted-foreground mt-2">{entry.attendance_record}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Classrooms for Staff */}
      {isAdmin() && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Available Classrooms for Pickup Classes</h2>
          </div>

          <div className="grid gap-3">
            {classrooms.filter((classroom) =>
              !classroomAllocations.some((a) => a.classroom_id === classroom.id)
            ).slice(0, 8).map((classroom) => (
              <div
                key={classroom.id}
                className="flex items-center justify-between rounded border p-3 hover:bg-muted/50"
               >
                <div>
                  <p className="font-medium">Block {classroom.block_id} - Floor {classroom.floor_number} - Room {classroom.classroom_number}</p>
                  <p className="text-sm text-muted-foreground">Capacity: {classroom.capacity} students</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">Available</Badge>
                  <Button
                    size="sm"
                    disabled={isSavingScheduleAction}
                    onClick={() => handleAdminBookClassroom(classroom)}
                  >
                    Book
                  </Button>
                </div>
              </div>
            ))}

            {classrooms.filter((classroom) =>
              !classroomAllocations.some((a) => a.classroom_id === classroom.id)
            ).length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No classrooms are currently free for pickup booking in this slot.
              </div>
            )}
          </div>
        </Card>
      )}

      {isStudent() && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Teacher Search</h2>
          </div>

          <Input
            placeholder="Search teacher by name"
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
          />

          {searchTeacher.trim().length > 0 && (
            <div className="mt-4 space-y-2">
              {teacherSearchRows.length === 0 && (
                <p className="text-sm text-muted-foreground">No matching teacher found.</p>
              )}

              {teacherSearchRows.map((row) => (
                <div key={row.teacher.user_id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{row.teacher.name}</p>
                    <Badge>{row.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Department: {row.teacher.department || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Location:{" "}
                    {row.classroom && row.block
                      ? `${row.block.name} / Floor ${row.classroom.floor_number} / ${getClassroomCode(row.classroom)}`
                      : "Not in class"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Session End: {row.endTime || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedClassroom
                ? `${getClassroomCode(selectedClassroom)} - Floor ${selectedClassroom.floor_number}`
                : "Classroom Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedClassroom && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Status:</label>
                <div className="mt-2">
                  <Badge className={statusLabelClass[selectedClassroomLiveState]}>
                    {getLiveStatusLabel(selectedClassroomLiveState)}
                  </Badge>
                </div>
              </div>

              {selectedSchedule && (
                <>
                  <div>
                    <label className="text-sm font-medium">Teacher:</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTeacher?.name || "Unassigned"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Department:</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedSchedule.department || selectedTeacher?.department || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Section:</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedSchedule.section || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Time Slot:</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(selectedSchedule.slot_start).toLocaleTimeString()} -{" "}
                      {new Date(selectedSchedule.slot_end).toLocaleTimeString()}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium">Capacity:</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedClassroom.capacity} students
                </p>
              </div>

              {classroomStatus && (
                <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Teacher:</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Currently in class</p>
                  {classroomStatus.marked_in_at && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>In: {new Date(classroomStatus.marked_in_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedSchedule && canConfirmPresence && (
                <Button
                  onClick={handleConfirmPresence}
                  disabled={isSavingScheduleAction || !!selectedSchedule.confirmed_at}
                  className="w-full"
                >
                  {selectedSchedule.confirmed_at ? "Presence Confirmed" : "Confirm Presence"}
                </Button>
              )}

              {selectedSchedule && canMarkOffsite && (
                <div className="space-y-2 rounded border p-3">
                  <label className="text-sm font-medium">Mark Session Offsite</label>
                  <select
                    value={offsiteReason}
                    onChange={(e) => setOffsiteReason(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-gray-50 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {OFFSITE_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={handleMarkOffsite}
                    disabled={isSavingScheduleAction}
                    className="w-full"
                  >
                    Mark Offsite
                  </Button>
                </div>
              )}

              {(selectedSchedule || isAdmin()) && (
                <Button variant="secondary" onClick={handleTakeAttendance} className="w-full">
                  Take Attendance
                </Button>
              )}

              <Button
                onClick={handleMarkAttendance}
                disabled={isMarking}
                variant="outline"
                className="w-full"
              >
                {isMarking ? "Updating..." : classroomStatus ? "Mark Out" : "Mark In"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartClassroom;
