'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FloorVisualizerProps {
  buildingId: string;
  floorNumber: number;
  allocations?: Allocation[];
  externalTeacherQuery?: string;
  isAdmin?: boolean;
  currentUserId?: string;
  onAdminRoomAction?: (payload: {
    action: 'book' | 'takeover' | 'unbook';
    buildingId: string;
    floorNumber: number;
    roomNumber: number;
    allocation?: Allocation;
  }) => Promise<void> | void;
}

interface Allocation {
  classroom_id: string;
  building_id: string;
  floor_number?: number;
  room_number: number;
  allocated_staff: string;
  subject: string;
  batch: string;
  time_start: string;
  time_end: string;
  is_staff_present: boolean;
  substitute_staff?: string;
  session_status?: string;
  department?: string | null;
  teacher_user_id?: string;
}

interface BuildingMesh extends THREE.Group {
  userData: {
    buildingId: string;
  };
}

interface WindowMesh extends THREE.Mesh {
  userData: {
    buildingId: string;
    floorNumber: number;
    roomNumber: number;
    isBooked: boolean;
  };
}





// ── REPLACEMENT BUILDING GENERATORS ──

// ── REPLACEMENT BUILDING GENERATORS ──

// Building A: RIT Block (Blue glass, alternating stripes, red borders)
function createSmartAcademicBlock(scene, bld, bodyMap) {
  const group = new THREE.Group();
  group.userData.buildingId = 'A';
  const width = 36;
  const height = 24;
  const depth = 16;
  if(bld) group.position.set(bld.position.x, bld.position.y, bld.position.z);
  else group.position.set(-80, 0, 0);

  // Main back/base shell
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), shellMat);
  shell.position.y = height / 2;
  shell.castShadow = true; shell.receiveShadow = true;
  if(bld) shell.userData = { building: bld };
  group.add(shell);
  if(bodyMap && bld) bodyMap.set(bld.id, shell);

  const glassColor = 0x66aaff;
  const redColor = 0xd32f2f;

  // Central large glass section
  const centerGlassMat = new THREE.MeshStandardMaterial({ color: glassColor, roughness: 0.1, metalness: 0.3 });
  const centerGlass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, height * 0.7, depth + 0.2), centerGlassMat);
  centerGlass.position.y = height / 2 + 1;
  group.add(centerGlass);

  // Side stripes (Blue and White)
  const blueStripeMat = new THREE.MeshStandardMaterial({ color: glassColor, roughness: 0.2 });
  const redMat = new THREE.MeshStandardMaterial({ color: redColor, roughness: 0.7 });
  
  for (let i = 1; i <= 4; i++) {
    const h = i * (height / 5);
    // Blue stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 2, depth + 0.1), blueStripeMat);
    stripe.position.y = h - 1;
    group.add(stripe);
    // Red thin separator
    const redLedge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.4, depth + 0.2), redMat);
    redLedge.position.y = h;
    group.add(redLedge);
    
    // Zig-zag lines on left
    const zigMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const zig = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.5), zigMat);
    zig.position.set(-width / 2 + 2, h - 1.5, depth / 2 + 0.1);
    zig.rotation.z = (i % 2 === 0) ? Math.PI / 4 : -Math.PI / 4;
    group.add(zig);
  }

  // Top Red Roof Trim
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 1, depth + 0.4), redMat);
  roofTrim.position.y = height + 0.5;
  group.add(roofTrim);

  // Bottom entrance
  const entrance = new THREE.Mesh(new THREE.BoxGeometry(6, 4, depth + 0.4), blueStripeMat);
  entrance.position.set(-width/4, 2, 0);
  group.add(entrance);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 3), redMat);
  awning.position.set(-width/4, 4.25, depth/2 + 1);
  group.add(awning);

  scene.add(group);
  return group;
}

// Building B: White classic structure with multiple pillars
function createSmartMainBlock(scene, bld, bodyMap) {
  const group = new THREE.Group();
  group.userData.buildingId = 'B';
  const width = 45;
  const height = 30;
  const depth = 20;

  if(bld) group.position.set(bld.position.x, bld.position.y, bld.position.z);
  else group.position.set(0, 0, 0);

  const shellMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), shellMat);
  shell.position.y = height / 2;
  shell.castShadow = true; shell.receiveShadow = true;
  if(bld) shell.userData = { building: bld };
  group.add(shell);
  if(bodyMap && bld) bodyMap.set(bld.id, shell);

  // Roof blocks
  for(let x of [-15, 0, 15]) {
    const rBlock = new THREE.Mesh(new THREE.BoxGeometry(8, 4, depth-2), shellMat);
    rBlock.position.set(x, height + 2, 0);
    group.add(rBlock);
  }

  // Windows grid
  const winMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
  for(let r = 1; r <= 6; r++) {
      for(let c = -10; c <= 10; c++) {
          if (c % 5 === 0) continue; // Leave gaps
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), winMat);
          win.position.set(c * 2, r * 4 + 1, depth/2 + 0.05);
          group.add(win);
      }
  }

  // Central Entrance
  const entMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const entrance = new THREE.Group();
  entrance.position.set(0, 0, depth/2);
  
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 6), shellMat);
  canopy.position.set(0, 8, 3);
  entrance.add(canopy);

  // Cross arches
  const arch1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), entMat);
  arch1.position.set(-4, 4, 5); arch1.rotation.z = Math.PI / 8;
  entrance.add(arch1);
  const arch1b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), entMat);
  arch1b.position.set(-4, 4, 5); arch1b.rotation.z = -Math.PI / 8;
  entrance.add(arch1b);

  const arch2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), entMat);
  arch2.position.set(4, 4, 5); arch2.rotation.z = Math.PI / 8;
  entrance.add(arch2);
  const arch2b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), entMat);
  arch2b.position.set(4, 4, 5); arch2b.rotation.z = -Math.PI / 8;
  entrance.add(arch2b);

  group.add(entrance);

  // Side Entrances
  for (let sx of [-16, 16]) {
    const sideEnt = new THREE.Group();
    sideEnt.position.set(sx, 0, depth/2);
    const sCanopy = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 4), shellMat);
    sCanopy.position.set(0, 5, 2);
    sideEnt.add(sCanopy);
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), entMat);
    p1.position.set(-2.5, 2.5, 3.5);
    sideEnt.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), entMat);
    p2.position.set(2.5, 2.5, 3.5);
    sideEnt.add(p2);
    group.add(sideEnt);
  }

  scene.add(group);
  return group;
}

// Building C: Brown and White with stairs/ramp
function createSmartAuditorium(scene, bld, bodyMap) {
  const group = new THREE.Group();
  group.userData.buildingId = 'C';
  const width = 36;
  const height = 22;
  const depth = 18;
  if(bld) group.position.set(bld.position.x, bld.position.y, bld.position.z);
  else group.position.set(80, 0, 0);

  const shellMat = new THREE.MeshBasicMaterial({ visible: false });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), shellMat);
  shell.position.y = height/2;
  if(bld) shell.userData = { building: bld };
  group.add(shell);
  if(bodyMap && bld) bodyMap.set(bld.id, shell);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 });
  const brownMat = new THREE.MeshStandardMaterial({ color: 0x9b6b4b, roughness: 0.8 });
  const beigeMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 });

  // Main White Block (Right)
  const mainWhite = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, height, depth), whiteMat);
  mainWhite.position.set(width * 0.2, height/2, 0);
  mainWhite.castShadow = true;
  group.add(mainWhite);

  // Tower Block (Top Left)
  const tower = new THREE.Mesh(new THREE.BoxGeometry(width * 0.25, height + 4, depth), whiteMat);
  tower.position.set(-width * 0.225, (height+4)/2, 0);
  tower.castShadow = true;
  group.add(tower);

  // Front Brown Framing
  const brownFrame1 = new THREE.Mesh(new THREE.BoxGeometry(1, height-2, depth+0.2), brownMat);
  brownFrame1.position.set(-width*0.05, height/2 - 1, 0);
  group.add(brownFrame1);
  const brownFrame2 = new THREE.Mesh(new THREE.BoxGeometry(1, height-2, depth+0.2), brownMat);
  brownFrame2.position.set(-width*0.35, height/2 - 1, 0);
  group.add(brownFrame2);
  const brownTop = new THREE.Mesh(new THREE.BoxGeometry(width*0.3+0.2, 3, depth+0.4), brownMat);
  brownTop.position.set(-width*0.2, height-1.5, 0);
  group.add(brownTop);

  // Blue glass inside brown frame
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, transparent: true, opacity: 0.7 });
  const bigGlass = new THREE.Mesh(new THREE.BoxGeometry(width*0.3 - 2, height-5, depth+0.3), glassMat);
  bigGlass.position.set(-width*0.2, (height-5)/2, 0);
  group.add(bigGlass);

  // Far Left Beige extensions
  for(let i=0; i<3; i++) {
    const ext = new THREE.Mesh(new THREE.BoxGeometry(2, height - 6 - i*2, depth - 4), i%2===0 ? beigeMat : brownMat);
    ext.position.set(-width*0.35 - 2 - i*2, (height - 6 - i*2)/2, 0);
    group.add(ext);
  }

  // Windows on White part
  const winMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, transparent: true, opacity: 0.8 });
  for(let r=1; r<=3; r++) {
    for(let c=0; c<2; c++) {
      const winGroup = new THREE.Group();
      winGroup.position.set(width * 0.15 + c*7, r*6, depth/2 + 0.05);
      const w1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), winMat);
      w1.position.x = -1.2;
      winGroup.add(w1);
      const w2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), winMat);
      w2.position.x = 1.2;
      winGroup.add(w2);
      group.add(winGroup);
    }
  }

  // Front Stairs and Ramp
  const stairMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const stairGroup = new THREE.Group();
  stairGroup.position.set(-width*0.2, 0, depth/2 + 2);
  for(let i=0; i<5; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 4 - i*0.8), stairMat);
    step.position.set(0, i*0.2 + 0.1, (4 - i*0.8)/2);
    stairGroup.add(step);
  }
  group.add(stairGroup);

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 6), stairMat);
  ramp.position.set(width*0.1, 0.6, depth/2 + 3);
  ramp.rotation.x = -Math.PI / 16;
  group.add(ramp);

  scene.add(group);
  return group;
}

export const FloorVisualizer: React.FC<FloorVisualizerProps> = ({
  buildingId,
  floorNumber,
  allocations = [],
  externalTeacherQuery,
  isAdmin = false,
  currentUserId,
  onAdminRoomAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const windowMeshesRef = useRef<Map<string, WindowMesh>>(new Map());
  const cameraStateRef = useRef<
    Record<string, { targetX: number; targetY: number; targetZ: number; radius: number; theta: number; phi: number }>
  >({});
  
  const [selectedRoom, setSelectedRoom] = useState<{ 
    buildingId: string; 
    floorNumber: number;
    roomNumber: number; 
    isBooked: boolean;
    allocation?: Allocation;
  } | null>(null);
  const [teacherQuery, setTeacherQuery] = useState('');
  const [isApplyingRoomAction, setIsApplyingRoomAction] = useState(false);

  const getStatusColor = (status: string) => {
    if (status === 'OCCUPIED') return 0x3b82f6; // teacher present
    if (status === 'SCHEDULED' || status === 'UNATTENDED') return 0xef4444; // allocated, teacher absent
    return 0x22c55e; // free/other
  };

  const getAllocationStatus = (allocation?: Allocation) => {
    if (!allocation) return 'FREE';
    return allocation.is_staff_present ? 'OCCUPIED' : 'SCHEDULED';
  };

  const matchesAllocation = (
    allocation: Allocation,
    roomBuildingId: string,
    roomFloor: number,
    roomNumber: number
  ) => {
    const allocationBuilding = String(allocation.building_id || '').trim().toUpperCase();
    const roomBuilding = roomBuildingId.trim().toUpperCase();
    if (allocationBuilding !== roomBuilding) {
      return false;
    }

    const directRoomMatch = allocation.room_number === roomNumber;
    const compositeRoomMatch = allocation.room_number === roomFloor * 100 + roomNumber;
    if (!directRoomMatch && !compositeRoomMatch) {
      return false;
    }

    if (typeof allocation.floor_number !== 'number') {
      return true;
    }

    return allocation.floor_number === roomFloor;
  };

  const createSkeletalBlock = (
    scene: THREE.Scene,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    color: number,
    label: string
  ) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const focusedFloor = floorNumber >= 0 ? floorNumber : null;

    const blockIdByLabel: Record<string, string> = {
      '1': 'A',
      '2': 'B',
      '3': 'C',
    };
    const buildingRef = blockIdByLabel[label] || label;

    const layoutByBuilding: Record<
      string,
      {
        floors: number;
        roomsPerFloor: number;
        mode: 'line' | 'ring';
        skipGroundFloor: boolean;
      }
    > = {
      A: { floors: 4, roomsPerFloor: 8, mode: 'ring', skipGroundFloor: false },
      B: { floors: 4, roomsPerFloor: 7, mode: 'line', skipGroundFloor: false },
      C: { floors: 8, roomsPerFloor: 7, mode: 'line', skipGroundFloor: false },
    };
    const layout = layoutByBuilding[buildingRef] || layoutByBuilding['A'];

    const block3Template: string[][] = buildingRef === 'A'
      ? [
          ['0', '0', '0', '3', 'sr', '2'],
          ['0', 'S', '4', 'O', 'p', '1'],
          ['0', 'p', 'p', 'p', 'p', 'sr'],
          ['sr', 'p', 'O', '8', '0', '0'],
          ['6', 'sr', '7', '0', 's', 'L'],
        ]
      : [];

    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.95 })
    );
    outline.position.y = height / 2;
    group.add(outline);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.96, height * 0.96, depth * 0.96),
      new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        roughness: 0.95,
        metalness: 0.02,
        depthWrite: false,
      })
    );
    body.position.y = height / 2;
    group.add(body);

    const floorCount = Math.max(layout.floors, 2);
    const slabThickness = 0.15;
    for (let floorIndex = 1; floorIndex < floorCount; floorIndex += 1) {
      const slabY = floorIndex * (height / floorCount);
      if (buildingRef === 'A' && block3Template.length > 0) {
        const rows = block3Template.length;
        const cols = block3Template[0].length;
        const usableWidth = width * 0.94;
        const usableDepth = depth * 0.94;
        const tileW = usableWidth / cols;
        const tileD = usableDepth / rows;

        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            const token = block3Template[r][c];
            if (token.toLowerCase() === 'o') {
              continue;
            }

            const slabTile = new THREE.Mesh(
              new THREE.BoxGeometry(tileW * 0.96, slabThickness, tileD * 0.96),
              new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.26 })
            );
            const tx = -usableWidth / 2 + c * tileW + tileW / 2;
            const tz = -usableDepth / 2 + r * tileD + tileD / 2;
            slabTile.position.set(tx, slabY, tz);
            group.add(slabTile);
          }
        }
      } else {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.98, slabThickness, depth * 0.98),
          new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.26 })
        );
        slab.position.y = slabY;
        group.add(slab);
      }
    }

    const floorBand = height / layout.floors;
    const classroomMaterial = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.9,
      shininess: 90,
    });

    const getRoomColor = (roomNumber: number, floorForRoom: number) => {
      const allocation = allocations.find((a) =>
        matchesAllocation(a, buildingRef, floorForRoom, roomNumber)
      );
      const status = getAllocationStatus(allocation);
      return getStatusColor(status);
    };

    const spawnClassroom = (
      roomNumber: number,
      floorForRoom: number,
      cx: number,
      cy: number,
      cz: number,
      roomWidth: number,
      roomHeight: number,
      roomDepth: number
    ) => {
      const roomColor = getRoomColor(roomNumber, floorForRoom);
      const roomMat = classroomMaterial.clone();
      roomMat.color.setHex(roomColor);
      roomMat.emissive.setHex(roomColor);
      roomMat.emissiveIntensity = roomColor === 0x22c55e ? 0.14 : 0.3;

      const classroom = (new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth),
        roomMat
      ) as unknown) as WindowMesh;

      classroom.userData = {
        buildingId: buildingRef,
        floorNumber: floorForRoom,
        roomNumber,
        isBooked: allocations.some((a) => matchesAllocation(a, buildingRef, floorForRoom, roomNumber)),
      };

      classroom.position.set(cx, cy, cz);
      classroom.castShadow = true;
      classroom.receiveShadow = true;
      group.add(classroom);
      windowMeshesRef.current.set(`${buildingRef}-${floorForRoom}-${roomNumber}`, classroom);
    };

    for (let floorIndex = 0; floorIndex < layout.floors; floorIndex += 1) {
      if (focusedFloor !== null && floorIndex !== focusedFloor) {
        continue;
      }

      if (layout.skipGroundFloor && floorIndex === 0) {
        continue;
      }

      const floorBaseY = floorIndex * floorBand;
      const roomHeight = Math.max(1.7, floorBand * 0.46);
      const roomCenterY = floorBaseY + slabThickness + roomHeight / 2 + 0.25;

      const spawnUtilityCell = (
        cx: number,
        cz: number,
        cellWidth: number,
        cellDepth: number,
        cellHeight: number,
        cellColor: number,
        cellOpacity: number
      ) => {
        const cell = new THREE.Mesh(
          new THREE.BoxGeometry(cellWidth, cellHeight, cellDepth),
          new THREE.MeshStandardMaterial({
            color: cellColor,
            transparent: true,
            opacity: cellOpacity,
            roughness: 0.8,
            metalness: 0.1,
          })
        );
        cell.position.set(cx, roomCenterY, cz);
        group.add(cell);
      };

      const spawnUtilityLabel = (cx: number, cy: number, cz: number, text: string, bg = 'rgba(15, 23, 42, 0.82)') => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 256, 96);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 48);
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
        sprite.scale.set(3.8, 1.45, 1);
        sprite.position.set(cx, cy, cz);
        group.add(sprite);
      };

      const spawnVerticalStack = (
        cx: number,
        cz: number,
        stackWidth: number,
        stackDepth: number,
        stackColor: number,
        stackOpacity: number
      ) => {
        const shaftHeight = Math.max(2, height * 0.94);
        const shaft = new THREE.Mesh(
          new THREE.BoxGeometry(stackWidth, shaftHeight, stackDepth),
          new THREE.MeshStandardMaterial({
            color: stackColor,
            transparent: true,
            opacity: stackOpacity,
            roughness: 0.72,
            metalness: 0.12,
          })
        );
        shaft.position.set(cx, shaftHeight / 2, cz);
        group.add(shaft);
      };

      if (layout.mode === 'line') {
        const roomWidth = width * 0.1;
        const roomDepth = Math.min(depth * 0.3, 4.2);

        if (buildingRef === 'B' || buildingRef === 'C') {
          const leftCount = buildingRef === 'C' ? 4 : 3;
          const rightCount = buildingRef === 'C' ? 3 : 4;
          const centerGap = 1.15;
          const edgeMargin = 1.1;
          const roomGap = 0.9;
          const stairWidth = width * 0.14;

          const leftZoneStart = -width / 2 + edgeMargin;
          const leftZoneEnd = -stairWidth / 2 - centerGap;
          const rightZoneStart = stairWidth / 2 + centerGap;
          const rightZoneEnd = width / 2 - edgeMargin;

          const leftZoneWidth = Math.max(0, leftZoneEnd - leftZoneStart);
          const rightZoneWidth = Math.max(0, rightZoneEnd - rightZoneStart);

          const leftRoomWidth = (leftZoneWidth - roomGap * (leftCount - 1)) / leftCount;
          const rightRoomWidth = (rightZoneWidth - roomGap * (rightCount - 1)) / rightCount;
          const blockRoomWidth = Math.max(2.6, Math.min(leftRoomWidth, rightRoomWidth));

          const leftUsedWidth = leftCount * blockRoomWidth + roomGap * (leftCount - 1);
          const rightUsedWidth = rightCount * blockRoomWidth + roomGap * (rightCount - 1);
          const leftStart = leftZoneStart + Math.max(0, (leftZoneWidth - leftUsedWidth) / 2);
          const rightStart = rightZoneStart + Math.max(0, (rightZoneWidth - rightUsedWidth) / 2);

          const buildCenters = (start: number, count: number) => {
            const centers: number[] = [];
            for (let i = 0; i < count; i += 1) {
              centers.push(start + blockRoomWidth / 2 + i * (blockRoomWidth + roomGap));
            }
            return centers;
          };

          const leftSlots = buildCenters(leftStart, leftCount);
          const rightSlots = buildCenters(rightStart, rightCount);
          const classZ = depth / 2 - roomDepth * 0.58;

          if (buildingRef === 'C') {
            const orderedSlots = [...leftSlots, ...rightSlots].sort((a, b) => b - a);
            for (let i = 0; i < orderedSlots.length; i += 1) {
              const roomNumber = i + 1;
              spawnClassroom(roomNumber, floorIndex, orderedSlots[i], roomCenterY, classZ, blockRoomWidth, roomHeight, roomDepth);
            }
          } else {
            for (let i = 0; i < leftSlots.length; i += 1) {
              const roomNumber = i + 1;
              spawnClassroom(roomNumber, floorIndex, leftSlots[i], roomCenterY, classZ, blockRoomWidth, roomHeight, roomDepth);
            }

            for (let i = 0; i < rightSlots.length; i += 1) {
              const roomNumber = leftSlots.length + i + 1;
              spawnClassroom(roomNumber, floorIndex, rightSlots[i], roomCenterY, classZ, blockRoomWidth, roomHeight, roomDepth);
            }
          }

          if (focusedFloor === null ? floorIndex === 0 : floorIndex === focusedFloor) {
            const stairCore = new THREE.Mesh(
              new THREE.BoxGeometry(stairWidth, height * 0.95, depth * 0.34),
              new THREE.MeshStandardMaterial({
                color: 0xcbd5e1,
                transparent: true,
                opacity: 0.28,
                roughness: 0.75,
                metalness: 0.08,
              })
            );
            stairCore.position.set(0, height * 0.48, classZ);
            group.add(stairCore);

            for (let s = 0; s < layout.floors * 3; s += 1) {
              const step = new THREE.Mesh(
                new THREE.BoxGeometry(width * 0.11, 0.18, depth * 0.05),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.8 })
              );
              step.position.set(
                0,
                0.35 + s * (floorBand / 3),
                classZ - depth * 0.07 + (s % 3) * (depth * 0.03)
              );
              group.add(step);
            }
          }
        } else {
          const spacing = width / (layout.roomsPerFloor + 1);
          for (let room = 1; room <= layout.roomsPerFloor; room += 1) {
            spawnClassroom(
              room,
              floorIndex,
              -width / 2 + spacing * room,
              roomCenterY,
              depth / 2 - roomDepth * 0.55,
              roomWidth,
              roomHeight,
              roomDepth
            );
          }
        }
      } else {
        if (buildingRef === 'A' && block3Template.length > 0) {
          const rows = block3Template.length;
          const cols = block3Template[0].length;
          const usableWidth = width * 0.9;
          const usableDepth = depth * 0.9;
          const cellW = usableWidth / cols;
          const cellD = usableDepth / rows;
          const classW = cellW * 0.86;
          const classD = cellD * 0.84;
          const classH = Math.max(1.5, floorBand * 0.42);

          for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
              const token = block3Template[r][c];
              const normalized = token.toLowerCase();
              const px = -usableWidth / 2 + c * cellW + cellW / 2;
              const pz = -usableDepth / 2 + r * cellD + cellD / 2;

              if (normalized === '0') {
                continue;
              }
              if (normalized === 'o') {
                continue;
              }

              if (/^[0-9]+$/.test(token)) {
                const roomNumber = parseInt(token, 10);
                spawnClassroom(roomNumber, floorIndex, px, roomCenterY, pz, classW, classH, classD);
                continue;
              }

              if (normalized === 'sr') {
                spawnUtilityCell(px, pz, classW, classH, classD, 0x14532d, 0.84);
                if (floorIndex === layout.floors - 1) {
                  spawnUtilityLabel(px, roomCenterY + classH * 0.75, pz, 'SR');
                }
                continue;
              }

              if (normalized === 'l') {
                if (focusedFloor !== null) {
                  continue;
                }
                if (focusedFloor === null ? floorIndex === 0 : floorIndex === focusedFloor) {
                  spawnVerticalStack(px, pz, classW * 0.58, classD * 0.58, 0x000000, 0.92);
                  spawnUtilityLabel(px, height + 1.5, pz, 'LIFT', 'rgba(0, 0, 0, 0.78)');
                }
                continue;
              }

              if (normalized === 's') {
                if (focusedFloor !== null) {
                  continue;
                }
                if (focusedFloor === null ? floorIndex === 0 : floorIndex === focusedFloor) {
                  spawnVerticalStack(px, pz, classW * 0.64, classD * 0.64, 0x7e22ce, 0.88);
                  spawnUtilityLabel(px, height + 1.5, pz, 'STAIRS', 'rgba(66, 18, 122, 0.78)');
                }
                continue;
              }

              if (normalized === 'p') {
                const corridorTile = new THREE.Mesh(
                  new THREE.BoxGeometry(classW * 0.92, 0.12, classD * 0.92),
                  new THREE.MeshStandardMaterial({ color: 0x64748b, transparent: true, opacity: 0.42 })
                );
                corridorTile.position.set(px, floorBaseY + slabThickness + 0.1, pz);
                group.add(corridorTile);
              }
            }
          }

          continue;
        }

        const roomHeight = Math.max(1.6, floorBand * 0.44);
        const roomWidth = width * 0.2;
        const roomDepth = depth * 0.2;
        let ringRoom = 1;

        for (let gx = 0; gx < 3; gx += 1) {
          for (let gz = 0; gz < 3; gz += 1) {
            if (gx === 1 && gz === 1) {
              continue;
            }

            const px = -width * 0.34 + gx * width * 0.34;
            const pz = -depth * 0.34 + gz * depth * 0.34;
            spawnClassroom(ringRoom, floorIndex, px, roomCenterY, pz, roomWidth, roomHeight, roomDepth);
            ringRoom += 1;
          }
        }
      }
    }

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 320;
    labelCanvas.height = 120;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 15, 25, 0.82)';
      ctx.fillRect(0, 0, 320, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 160, 60);
    }

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthWrite: false })
    );
    labelSprite.scale.set(7.5, 2.8, 1);
    labelSprite.position.set(0, height + 2.6, 0);
    group.add(labelSprite);

    scene.add(group);
    return group;
  };

  const highlightRoomWindow = () => {
    windowMeshesRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      const allocation = allocations.find((a) =>
        matchesAllocation(a, mesh.userData.buildingId, mesh.userData.floorNumber, mesh.userData.roomNumber)
      );
      const status = getAllocationStatus(allocation);
      const statusColor = getStatusColor(status);

      mat.color.setHex(statusColor);
      mat.emissive.setHex(statusColor);
      mat.emissiveIntensity = status === 'FREE' ? 0.12 : 0.32;
    });
  };

  // Function to create a building with clickable rooms
  const createBuildingWithRooms = (x: number, z: number, width: number, depth: number, height: number, color: number, buildingLabel: string) => {
    const group = new THREE.Group() as BuildingMesh;
    group.userData.buildingId = buildingLabel;

    // Main building body
    const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = height / 2;
    group.add(body);

    // Create clickable room windows in a grid pattern
    const roomsPerRow = 5;
    const roomsPerColumn = 4;
    const windowWidth = (width - 2) / roomsPerRow;
    const windowHeight = (height - 3) / roomsPerColumn;
    const windowDepth = 0.3;
    let roomNumber = 1;

    // Front face windows - clickable rooms
    for (let row = 0; row < roomsPerColumn; row++) {
      for (let col = 0; col < roomsPerRow; col++) {
        const windowGeom = new THREE.BoxGeometry(windowWidth * 0.85, windowHeight * 0.85, windowDepth);
        const roomAllocation = allocations.find(a => a.building_id === buildingLabel && a.room_number === roomNumber);
        const roomStatus = getAllocationStatus(roomAllocation);
        const roomColor = getStatusColor(roomStatus);
        const windowMat = new THREE.MeshPhongMaterial({ 
          color: roomColor,
          emissive: roomColor,
          emissiveIntensity: roomStatus === 'FREE' ? 0.12 : 0.32,
          shininess: 100
        });
        const windowMesh = (new THREE.Mesh(windowGeom, windowMat) as unknown) as WindowMesh;
        windowMesh.userData = {
          buildingId: buildingLabel,
          floorNumber: row,
          roomNumber: roomNumber,
          isBooked: !!roomAllocation
        };
        
        const xPos = -width / 2 + 1 + col * windowWidth + windowWidth / 2;
        const yPos = 1.5 + row * windowHeight + windowHeight / 2;
        windowMesh.position.set(xPos, yPos, depth / 2 + 0.2);
        windowMesh.castShadow = true;
        group.add(windowMesh);
        windowMeshesRef.current.set(`${buildingLabel}-${roomNumber}`, windowMesh);
        roomNumber++;
      }
    }

    // Side face windows
    for (let row = 0; row < roomsPerColumn; row++) {
      for (let col = 0; col < 3; col++) {
        const windowGeom = new THREE.BoxGeometry(windowDepth, windowHeight * 0.85, windowWidth * 0.85);
        const roomAllocation = allocations.find(a => a.building_id === buildingLabel && a.room_number === roomNumber);
        const roomStatus = getAllocationStatus(roomAllocation);
        const roomColor = getStatusColor(roomStatus);
        const windowMat = new THREE.MeshPhongMaterial({ 
          color: roomColor,
          emissive: roomColor,
          emissiveIntensity: roomStatus === 'FREE' ? 0.12 : 0.32,
          shininess: 100
        });
        const windowMesh = (new THREE.Mesh(windowGeom, windowMat) as unknown) as WindowMesh;
        windowMesh.userData = {
          buildingId: buildingLabel,
          floorNumber: row,
          roomNumber: roomNumber,
          isBooked: !!roomAllocation
        };
        
        const zPos = -depth / 2 + 1.5 + col * (depth / 3);
        const yPos = 1.5 + row * windowHeight + windowHeight / 2;
        windowMesh.position.set(width / 2 + 0.2, yPos, zPos);
        windowMesh.castShadow = true;
        group.add(windowMesh);
        windowMeshesRef.current.set(`${buildingLabel}-${roomNumber}`, windowMesh);
        roomNumber++;
      }
    }

    // Top billboard-style name board
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 220;
    const signCtx = signCanvas.getContext('2d');
    if (signCtx) {
      signCtx.clearRect(0, 0, 512, 220);
      signCtx.fillStyle = '#cc2f45';
      signCtx.fillRect(0, 0, 512, 220);
      signCtx.fillStyle = '#ffffff';
      signCtx.font = 'bold 88px Arial';
      signCtx.textAlign = 'center';
      signCtx.textBaseline = 'middle';
      signCtx.fillText(`BLOCK ${buildingLabel}`, 256, 100);
      signCtx.fillStyle = '#ffd166';
      signCtx.font = 'bold 34px Arial';
      signCtx.fillText('RIT CAMPUS', 256, 172);
    }
    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signboard = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.52, 2.4),
      new THREE.MeshPhongMaterial({
        map: signTexture,
        side: THREE.DoubleSide,
      })
    );
    signboard.position.set(0, height + 2.2, 0);
    group.add(signboard);

    // Two support poles for the top board
    const poleMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const poleGeo = new THREE.BoxGeometry(0.2, 2.2, 0.2);
    [-width * 0.18, width * 0.18].forEach((px) => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, height + 1.1, -0.1);
      pole.castShadow = true;
      group.add(pole);
    });

    group.position.set(x, 0, z);
    return group;
  };

  // Function to create trees
  const createTree = (x: number, z: number) => {
    const group = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.4, 0.5, 3.5, 10);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage - multiple cones for better shape
    const foliageGeom1 = new THREE.ConeGeometry(3.5, 5, 10);
    const foliageMat = new THREE.MeshPhongMaterial({ color: 0x2d5016 });
    const foliage1 = new THREE.Mesh(foliageGeom1, foliageMat);
    foliage1.position.y = 4.5;
    foliage1.castShadow = true;
    group.add(foliage1);

    // Second foliage layer for fuller look
    const foliageGeom2 = new THREE.ConeGeometry(2.8, 3, 10);
    const foliage2 = new THREE.Mesh(foliageGeom2, foliageMat);
    foliage2.position.y = 7;
    foliage2.castShadow = true;
    group.add(foliage2);

    group.position.set(x, 0, z);
    return group;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    windowMeshesRef.current.clear();

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xadd8e6); // Light blue sky
    sceneRef.current = scene;

    // Lighting - simulate sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(50, 60, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -400;
    directionalLight.shadow.camera.right = 400;
    directionalLight.shadow.camera.top = 400;
    directionalLight.shadow.camera.bottom = -400;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1200;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Camera - isometric view
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2500
    );
    camera.position.set(35, 45, 45);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const cameraStateKey = buildingId === 'dummy' ? 'dummy' : buildingId;
    let orbitOffset = camera.position.clone().sub(cameraTarget);
    let orbitRadius = orbitOffset.length();
    let orbitTheta = Math.atan2(orbitOffset.z, orbitOffset.x);
    let orbitPhi = Math.acos(orbitOffset.y / orbitRadius);
    let targetRadius = orbitRadius;
    let targetTheta = orbitTheta;
    let targetPhi = orbitPhi;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground plane - grass
    const groundGeometry = new THREE.PlaneGeometry(1200, 1200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.8,
      metalness: 0
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.01;
    scene.add(groundMesh);

    // --- ROADS AND PATHWAYS ---
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, roughness: 0.6 });

    // Main horizontal road connecting buildings
    const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(240, 16), roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.02, 35);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    // Branch paths to each building
    [-80, 0, 80].forEach(bx => {
      const branch = new THREE.Mesh(new THREE.PlaneGeometry(12, 26), pathMat);
      branch.rotation.x = -Math.PI / 2;
      // Positioned to bridge exactly from building entrance (z=5) to main road (z=27)
      branch.position.set(bx, 0.03, 18);
      branch.receiveShadow = true;
      scene.add(branch);
    });

    // --- CENTRAL FOUNTAIN ---
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0.04, 35); // Center of the road/plaza
    
    // Fountain base ring
    const baseGeo = new THREE.CylinderGeometry(7, 7, 0.6, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });
    const fBase = new THREE.Mesh(baseGeo, baseMat);
    fBase.position.y = 0.3;
    fBase.castShadow = true; fBase.receiveShadow = true;
    fountainGroup.add(fBase);

    // Water pool
    const waterGeo = new THREE.CylinderGeometry(6.2, 6.2, 0.5, 32);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.75, roughness: 0.1 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.4;
    fountainGroup.add(water);

    // Center column
    const colGeo = new THREE.CylinderGeometry(1.8, 2.5, 2.5, 16);
    const centerCol = new THREE.Mesh(colGeo, baseMat);
    centerCol.position.y = 1.25;
    centerCol.castShadow = true;
    fountainGroup.add(centerCol);

    // Upper water bowl
    const bowlGeo = new THREE.CylinderGeometry(3.5, 1.8, 0.5, 16);
    const bowl = new THREE.Mesh(bowlGeo, baseMat);
    bowl.position.y = 2.5;
    bowl.castShadow = true;
    fountainGroup.add(bowl);
    
    const waterBowl = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.2, 16), waterMat);
    waterBowl.position.y = 2.7;
    fountainGroup.add(waterBowl);

    // Top spout
    const spoutGeo = new THREE.CylinderGeometry(0.6, 1.0, 1.8, 8);
    const spout = new THREE.Mesh(spoutGeo, baseMat);
    spout.position.y = 3.6;
    spout.castShadow = true;
    fountainGroup.add(spout);

    // Water stream
    const streamGeo = new THREE.CylinderGeometry(0.3, 0.8, 2.5, 8);
    const streamMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, emissive: 0x1166aa });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.position.y = 5.2;
    fountainGroup.add(stream);

    scene.add(fountainGroup);

    // Create buildings with windows
    
    // ADD SMART BUILDINGS
    const academicBlock = createSmartAcademicBlock(scene, null, null);
    const mainBlock = createSmartMainBlock(scene, null, null);
    const auditoriumBlock = createSmartAuditorium(scene, null, null);

    const activeBuildingId = buildingId === 'dummy' ? null : buildingId;
    const buildingBlocks = [academicBlock, mainBlock, auditoriumBlock];
    const skeletalPalette: Record<string, { color: number; label: string; x: number; width: number; depth: number; height: number }> = {
      A: { color: 0x4f83cc, label: 'A', x: -80, width: 26, depth: 18, height: 30 },
      B: { color: 0xb8a27a, label: 'B', x: 0, width: 44, depth: 20, height: 34 },
      C: { color: 0xcc6b4a, label: 'C', x: 80, width: 34, depth: 20, height: 36 },
    };

    if (activeBuildingId) {
      buildingBlocks.forEach((block) => {
        block.visible = false;
      });

      const spec = skeletalPalette[activeBuildingId];
      if (spec) {
        createSkeletalBlock(scene, spec.x, 0, spec.width, spec.depth, spec.height, spec.color, spec.label);
        const savedState = cameraStateRef.current[cameraStateKey];
        if (savedState) {
          cameraTarget.set(savedState.targetX, savedState.targetY, savedState.targetZ);
          orbitRadius = savedState.radius;
          orbitTheta = savedState.theta;
          orbitPhi = savedState.phi;
          targetRadius = orbitRadius;
          targetTheta = orbitTheta;
          targetPhi = orbitPhi;
          const restoredOffset = new THREE.Vector3(
            orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta),
            orbitRadius * Math.cos(orbitPhi),
            orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta)
          );
          camera.position.copy(cameraTarget.clone().add(restoredOffset));
        } else {
          camera.position.set(spec.x + 36, 48, 46);
          cameraTarget.set(spec.x, 12, 0);
          orbitOffset = camera.position.clone().sub(cameraTarget);
          orbitRadius = orbitOffset.length();
          orbitTheta = Math.atan2(orbitOffset.z, orbitOffset.x);
          orbitPhi = Math.acos(orbitOffset.y / orbitRadius);
          targetRadius = orbitRadius;
          targetTheta = orbitTheta;
          targetPhi = orbitPhi;
        }
        camera.lookAt(cameraTarget);
      }
    }

    


    // Add trees around campus
    const trees = [
      // Building B (Middle) flank trees
      [-32, -10], [-32, 5], [-32, 20],
      [32, -10], [32, 5], [32, 20],
      
      // Building A (-80) flank trees
      [-110, -10], [-110, 5], [-110, 20], [-110, 35],
      [-50, -10], [-50, 5], [-50, 20],
      
      // Building C (80) flank trees
      [50, -10], [50, 5], [50, 20],
      [110, -10], [110, 5], [110, 20], [110, 35],

      // Back trees behind properties
      [-80, -25], [0, -25], [80, -25]
    ];

    trees.forEach(([tx, tz]) => {
      const tree = createTree(tx, tz);
      scene.add(tree);
    });

    // Mouse interaction - click to select room
    const onMouseClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const windowsArray = Array.from(windowMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(windowsArray);

      if (intersects.length > 0) {
        const clickedWindow = intersects[0].object as WindowMesh;
        const roomData = clickedWindow.userData;
        
        // Find allocation for this classroom if exists
        const allocation = allocations.find((a) =>
          matchesAllocation(a, roomData.buildingId, roomData.floorNumber, roomData.roomNumber)
        );
        
        setSelectedRoom({
          buildingId: roomData.buildingId,
          floorNumber: roomData.floorNumber,
          roomNumber: roomData.roomNumber,
          isBooked: !!allocation,
          allocation: allocation
        });
        highlightRoomWindow();
      } else {
        setSelectedRoom(null);
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Mouse wheel zoom
    const onMouseWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetRadius = Math.max(32, Math.min(180, targetRadius + event.deltaY * 0.05));
    };

    renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

    // Mouse drag to rotate
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      previousMousePosition = { x: e.clientX, y: e.clientY };

      targetTheta -= deltaX * 0.0042;
      targetPhi += deltaY * 0.0042;
      targetPhi = Math.max(0.22, Math.min(Math.PI - 0.22, targetPhi));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      orbitRadius += (targetRadius - orbitRadius) * 0.14;
      orbitTheta += (targetTheta - orbitTheta) * 0.18;
      orbitPhi += (targetPhi - orbitPhi) * 0.18;

      const smoothedOffset = new THREE.Vector3(
        orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta),
        orbitRadius * Math.cos(orbitPhi),
        orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta)
      );
      camera.position.copy(cameraTarget.clone().add(smoothedOffset));
      camera.lookAt(cameraTarget);

      cameraStateRef.current[cameraStateKey] = {
        targetX: cameraTarget.x,
        targetY: cameraTarget.y,
        targetZ: cameraTarget.z,
        radius: orbitRadius,
        theta: orbitTheta,
        phi: orbitPhi,
      };

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.domElement.removeEventListener('wheel', onMouseWheel);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [buildingId, floorNumber, allocations]);

  const teacherResults = teacherQuery.trim().length === 0
    ? []
    : allocations.filter((a) =>
        a.is_staff_present &&
        a.allocated_staff.toLowerCase().includes(teacherQuery.trim().toLowerCase())
      );

  const handleTeacherSelect = (allocation: Allocation) => {
    const floorFromClassroomId = allocation.classroom_id.match(/-F(\d+)-/i);
    const detectedFloor =
      typeof allocation.floor_number === 'number'
        ? allocation.floor_number
        : floorFromClassroomId
          ? Number(floorFromClassroomId[1])
          : floorNumber >= 0
            ? floorNumber
            : 0;
    const displayRoomNumber = allocation.room_number >= 100 ? allocation.room_number % 100 : allocation.room_number;
    setSelectedRoom({
      buildingId: allocation.building_id,
      floorNumber: detectedFloor,
      roomNumber: displayRoomNumber,
      isBooked: true,
      allocation,
    });
    highlightRoomWindow();
    setTeacherQuery(allocation.allocated_staff);
  };

  useEffect(() => {
    const query = externalTeacherQuery?.trim();
    if (!query) return;

    setTeacherQuery(query);
    const match = allocations.find(
      (a) => a.is_staff_present && a.allocated_staff.toLowerCase().includes(query.toLowerCase())
    );
    if (match) {
      handleTeacherSelect(match);
    }
  }, [externalTeacherQuery, allocations]);

  const selectedRoomCode = selectedRoom
    ? `${selectedRoom.buildingId}-${selectedRoom.floorNumber}${String(selectedRoom.roomNumber).padStart(2, '0')}`
    : null;

  const selectedRoomStatus = selectedRoom ? getAllocationStatus(selectedRoom.allocation) : 'FREE';
  const canUnbookSelectedRoom =
    !!selectedRoom?.allocation &&
    !!currentUserId &&
    selectedRoom.allocation.teacher_user_id === currentUserId;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        gap: '1rem'
      }}
    >
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px'
        }}
      />

      {/* Side Panel */}
      <div style={{ width: '420px', maxWidth: '100%', overflowY: 'auto', flexShrink: 0 }}>

      {/* Room Details Panel */}
      {selectedRoom && (
        <div>
          <Card className="bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedRoomCode}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Classroom Code</p>
                <p className="text-lg font-semibold">{selectedRoomCode}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={selectedRoomStatus === "OCCUPIED" ? "bg-blue-500" : selectedRoomStatus === "SCHEDULED" ? "bg-red-500" : "bg-green-500"}>
                  {selectedRoomStatus === "OCCUPIED" ? "OCCUPIED" : selectedRoomStatus === "SCHEDULED" ? "ALLOCATED" : "FREE"}
                </Badge>
              </div>

              {selectedRoom.allocation && (
                <div className="pt-2 border-t space-y-3">
                  <div className="rounded bg-slate-50 p-2 dark:bg-slate-800">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Teacher Occupancy</p>
                    <p className="text-sm font-medium">
                      {selectedRoom.allocation.is_staff_present
                        ? `${selectedRoom.allocation.allocated_staff} is currently in this classroom.`
                        : `${selectedRoom.allocation.allocated_staff} is allocated but currently not present.`}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Allocated Staff</p>
                    <p className="font-semibold">{selectedRoom.allocation.allocated_staff}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedRoom.allocation.department || "N/A"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{selectedRoom.allocation.subject}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Batch/Section</p>
                    <p className="font-medium">{selectedRoom.allocation.batch}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Class Time</p>
                    <p className="font-medium">{selectedRoom.allocation.time_start} - {selectedRoom.allocation.time_end}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Staff Presence</p>
                    <Badge className={selectedRoom.allocation.is_staff_present ? "bg-green-500" : "bg-red-500"}>
                      {selectedRoom.allocation.is_staff_present ? "✓ Present" : "✗ Absent"}
                    </Badge>
                  </div>

                  {!selectedRoom.allocation.is_staff_present && selectedRoom.allocation.substitute_staff && (
                    <div className="rounded bg-amber-50 p-2 dark:bg-amber-900/20">
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">Substitute Staff</p>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{selectedRoom.allocation.substitute_staff}</p>
                    </div>
                  )}
                </div>
              )}

              {!selectedRoom.allocation && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">No active allocation. Class is available for pickup.</p>
                </div>
              )}

              {isAdmin && onAdminRoomAction && (
                <div className="pt-2 border-t flex flex-wrap gap-2">
                  {!selectedRoom.allocation && (
                    <Button
                      size="sm"
                      disabled={isApplyingRoomAction}
                      onClick={async () => {
                        try {
                          setIsApplyingRoomAction(true);
                          await onAdminRoomAction({
                            action: 'book',
                            buildingId: selectedRoom.buildingId,
                            floorNumber: selectedRoom.floorNumber,
                            roomNumber: selectedRoom.roomNumber,
                            allocation: selectedRoom.allocation,
                          });
                        } finally {
                          setIsApplyingRoomAction(false);
                        }
                      }}
                    >
                      {isApplyingRoomAction ? 'Booking...' : 'Book Classroom'}
                    </Button>
                  )}

                  {selectedRoom.allocation && !selectedRoom.allocation.is_staff_present && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isApplyingRoomAction}
                      onClick={async () => {
                        try {
                          setIsApplyingRoomAction(true);
                          await onAdminRoomAction({
                            action: 'takeover',
                            buildingId: selectedRoom.buildingId,
                            floorNumber: selectedRoom.floorNumber,
                            roomNumber: selectedRoom.roomNumber,
                            allocation: selectedRoom.allocation,
                          });
                        } finally {
                          setIsApplyingRoomAction(false);
                        }
                      }}
                    >
                      {isApplyingRoomAction ? 'Updating...' : 'Mark Presence (Takeover)'}
                    </Button>
                  )}

                  {canUnbookSelectedRoom && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isApplyingRoomAction}
                      onClick={async () => {
                        try {
                          setIsApplyingRoomAction(true);
                          await onAdminRoomAction({
                            action: 'unbook',
                            buildingId: selectedRoom.buildingId,
                            floorNumber: selectedRoom.floorNumber,
                            roomNumber: selectedRoom.roomNumber,
                            allocation: selectedRoom.allocation,
                          });
                        } finally {
                          setIsApplyingRoomAction(false);
                        }
                      }}
                    >
                      {isApplyingRoomAction ? 'Removing...' : 'Unbook'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedRoom && (
        <Card className="bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-lg">Teacher Search</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the top "Search teacher by name" field. When you select a teacher, room occupancy details will appear here.
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};
