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
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Camera - isometric view
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
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
    const groundGeometry = new THREE.PlaneGeometry(150, 120);
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

    // Pathway - light concrete color
    const pathwayGeometry = new THREE.PlaneGeometry(8, 50);
    const pathwayMaterial = new THREE.MeshStandardMaterial({
      color: 0xd3d3d3,
      roughness: 0.6,
      metalness: 0.1
    });
    const pathwayMesh = new THREE.Mesh(pathwayGeometry, pathwayMaterial);
    pathwayMesh.rotation.x = -Math.PI / 2;
    pathwayMesh.position.y = 0.02;
    pathwayMesh.receiveShadow = true;
    scene.add(pathwayMesh);

    // Create buildings with windows
    const buildingA = createBuildingWithRooms(-24, 0, 16, 13, 19, 0x4a90e2, 'A');
    scene.add(buildingA);

    const buildingB = createBuildingWithRooms(0, 0, 18, 13, 20, 0xf5a623, 'B');
    scene.add(buildingB);

    const buildingC = createBuildingWithRooms(24, 0, 16, 13, 19, 0x7ed321, 'C');
    scene.add(buildingC);

    // Add trees around campus
    const trees = [
      [-28, -22], [-28, 12], [-28, 28],
      [28, -22], [28, 12], [28, 28],
      [-12, 22], [0, 28], [12, 22],
      [-38, 0], [38, 0],
      [-20, 35], [20, 35] // Back trees
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
