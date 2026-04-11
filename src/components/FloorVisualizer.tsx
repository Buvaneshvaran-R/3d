'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FloorVisualizerProps {
  buildingId: string;
  floorNumber: number;
  allocations?: Allocation[];
  externalTeacherQuery?: string;
}

interface Allocation {
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
}

interface BuildingMesh extends THREE.Group {
  userData: {
    buildingId: string;
  };
}

interface WindowMesh extends THREE.Mesh {
  userData: {
    buildingId: string;
    roomNumber: number;
    isBooked: boolean;
  };
}





// ── REPLACEMENT BUILDING GENERATORS ──

// ── REPLACEMENT BUILDING GENERATORS ──

// Building A: RIT Block (Blue glass, alternating stripes, red borders)
function createSmartAcademicBlock(scene, bld, bodyMap) {
  const group = new THREE.Group();
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const windowMeshesRef = useRef<Map<string, WindowMesh>>(new Map());
  
  const [selectedRoom, setSelectedRoom] = useState<{ 
    buildingId: string; 
    roomNumber: number; 
    isBooked: boolean;
    allocation?: Allocation;
  } | null>(null);
  const [teacherQuery, setTeacherQuery] = useState('');

  const highlightRoomWindow = (building: string, room: number) => {
    windowMeshesRef.current.forEach((mesh, key) => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      const allocation = allocations.find(a => a.building_id === mesh.userData.buildingId && a.room_number === mesh.userData.roomNumber);
      const hasPresentTeacher = !!allocation?.is_staff_present;

      mat.color.setHex(hasPresentTeacher ? 0xf59e0b : 0x87CEEB);
      mat.emissive.setHex(hasPresentTeacher ? 0x8a4b00 : 0xccffff);
      mat.emissiveIntensity = hasPresentTeacher ? 0.32 : 0.2;

      if (key === `${building}-${room}`) {
        mat.color.setHex(0x22c55e);
        mat.emissive.setHex(0x14532d);
        mat.emissiveIntensity = 0.45;
      }
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
        const hasPresentTeacher = !!roomAllocation?.is_staff_present;
        const windowMat = new THREE.MeshPhongMaterial({ 
          color: hasPresentTeacher ? 0xf59e0b : 0x87CEEB,
          emissive: hasPresentTeacher ? 0x8a4b00 : 0xccffff,
          emissiveIntensity: hasPresentTeacher ? 0.32 : 0.2,
          shininess: 100
        });
        const windowMesh = (new THREE.Mesh(windowGeom, windowMat) as unknown) as WindowMesh;
        windowMesh.userData = {
          buildingId: buildingLabel,
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
        const hasPresentTeacher = !!roomAllocation?.is_staff_present;
        const windowMat = new THREE.MeshPhongMaterial({ 
          color: hasPresentTeacher ? 0xf59e0b : 0x87CEEB,
          emissive: hasPresentTeacher ? 0x8a4b00 : 0xccffff,
          emissiveIntensity: hasPresentTeacher ? 0.32 : 0.2,
          shininess: 100
        });
        const windowMesh = (new THREE.Mesh(windowGeom, windowMat) as unknown) as WindowMesh;
        windowMesh.userData = {
          buildingId: buildingLabel,
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

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xadd8e6); // Light blue sky
    sceneRef.current = scene;

    // Lighting - simulate sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(50, 60, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
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

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
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
    createSmartAcademicBlock(scene, null, null);
    createSmartMainBlock(scene, null, null);
    createSmartAuditorium(scene, null, null);

    


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
        const allocation = allocations.find((a) => a.room_number === roomData.roomNumber && a.building_id === roomData.buildingId);
        
        setSelectedRoom({
          buildingId: roomData.buildingId,
          roomNumber: roomData.roomNumber,
          isBooked: !!allocation,
          allocation: allocation
        });
        highlightRoomWindow(roomData.buildingId, roomData.roomNumber);
      } else {
        setSelectedRoom(null);
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Mouse wheel zoom
    const onMouseWheel = (event: WheelEvent) => {
      event.preventDefault();
      const currentDistance = camera.position.length();
      const newDistance = Math.max(40, Math.min(160, currentDistance + event.deltaY * 0.05));
      const direction = camera.position.clone().normalize();
      camera.position.copy(direction.multiplyScalar(newDistance));
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

      // Rotate camera around the scene
      const radius = camera.position.length();
      let theta = Math.atan2(camera.position.z, camera.position.x);
      let phi = Math.acos(camera.position.y / radius);

      theta -= deltaX * 0.005;
      phi += deltaY * 0.005;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

      camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(0, 0, 0);
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
    setSelectedRoom({
      buildingId: allocation.building_id,
      roomNumber: allocation.room_number,
      isBooked: true,
      allocation,
    });
    highlightRoomWindow(allocation.building_id, allocation.room_number);
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
                Room {selectedRoom.roomNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="text-lg font-semibold">Block {selectedRoom.buildingId}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={selectedRoom.isBooked ? "bg-red-500" : "bg-green-500"}>
                  {selectedRoom.isBooked ? "🔴 Occupied" : "🟢 Available"}
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
