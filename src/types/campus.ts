// Campus data types
export interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'staff_room' | 'office' | 'seminar_hall' | 'exam_center' | 'storage' | 'service';
  floorNumber: number;
  buildingId: string;
  capacity?: number;
  position: { x: number; y: number; z: number }; // Position within the building
  staffAssigned?: string;
  occupancyStatus?: 'empty' | 'occupied' | 'maintenance';
}

export interface Floor {
  number: number;
  rooms: Room[];
  height: number; // Y position
}

export interface Building {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number }; // Center position on campus
  dimensions: { width: number; depth: number; height: number };
  floors: Floor[];
  color: { r: number; g: number; b: number };
  meshId?: string; // Three.js mesh reference
}

export interface CampusData {
  buildings: Building[];
  pathways: Pathway[];
  trees: TreePlacement[];
}

export interface Pathway {
  id: string;
  start: { x: number; z: number };
  end: { x: number; z: number };
  width: number;
}

export interface TreePlacement {
  id: string;
  position: { x: number; y: number; z: number };
  scale: number;
}

export interface StaffLocation {
  staffName: string;
  staffId: string;
  buildingId: string;
  floorNumber: number;
  roomId: string;
  roomName: string;
}

export interface CameraTarget {
  building: Building;
  floor?: Floor;
  room?: Room;
}
