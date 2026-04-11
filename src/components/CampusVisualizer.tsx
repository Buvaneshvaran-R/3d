'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Building, Room } from '@/types/campus';
import { campusData, findTeacherByRoomId } from '@/data/campusData';

/* ─────────────── Props ─────────────── */
interface CampusVisualizerProps {
  onRoomSelect?: (room: Room) => void;
  onBuildingSelect?: (building: Building) => void;
  highlightedRoom?: Room | null;
}

/* ─────────────── Typed mesh extensions ─────────────── */
interface RoomMesh extends THREE.Mesh {
  userData: { room: Room };
}
interface BuildingBodyMesh extends THREE.Mesh {
  userData: { building: Building };
}

/* ─────────────── Color helpers ─────────────── */
function getRoomColor(room: Room): number {
  const status = room.occupancyStatus ?? 'empty';
  switch (room.type) {
    case 'staff_room':   return status === 'empty' ? 0x8e24aa : 0x6a1b9a;
    case 'seminar_hall': return status === 'empty' ? 0xf57c00 : 0xe65100;
    case 'office':       return 0x1565c0;
    case 'exam_center':  return 0xd32f2f;
    case 'storage':      return 0x546e7a;
    case 'service':      return 0x00796b;
    default: // classroom
      if (status === 'empty')       return 0x388e3c;
      if (status === 'occupied')    return 0xc62828;
      return 0xe65100; // maintenance
  }
}

function getRoomTypeLabel(type: Room['type']): string {
  const labels: Record<Room['type'], string> = {
    classroom: 'Classroom', staff_room: 'Staff Room', office: 'Office',
    seminar_hall: 'Seminar Hall', exam_center: 'Exam Center',
    storage: 'Storage', service: 'Service Center',
  };
  return labels[type] ?? 'Room';
}

function getStatusHex(status: Room['occupancyStatus']): string {
  if (status === 'occupied')    return '#ef4444';
  if (status === 'maintenance') return '#f59e0b';
  return '#22c55e';
}

/* ─────────────── Camera utility ─────────────── */
function applySpherical(
  cam: THREE.PerspectiveCamera,
  theta: number, phi: number, r: number,
  target: THREE.Vector3
) {
  cam.position.x = target.x + r * Math.sin(phi) * Math.sin(theta);
  cam.position.y = target.y + r * Math.cos(phi);
  cam.position.z = target.z + r * Math.sin(phi) * Math.cos(theta);
  cam.lookAt(target);
}

/* ═══════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════ */
export const CampusVisualizer: React.FC<CampusVisualizerProps> = ({
  onRoomSelect,
  onBuildingSelect,
  highlightedRoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef       = useRef(0);

  /* mesh registries */
  const roomMeshes     = useRef<Map<string, RoomMesh>>(new Map());
  const buildingBodies = useRef<Map<string, BuildingBodyMesh>>(new Map());

  /* spherical-coord camera state (smooth lerp) */
  const sph  = useRef({ theta: 0.6, phi: 0.88, r: 125 });
  const tSph = useRef({ theta: 0.6, phi: 0.88, r: 125 });
  const lookAt  = useRef(new THREE.Vector3(0, 4, 0));
  const tLookAt = useRef(new THREE.Vector3(0, 4, 0));

  /* drag orbit */
  const drag = useRef({ on: false, lx: 0, ly: 0 });

  /* react ui */
  const [tooltip, setTooltip] = useState<{
    room?: Room; building?: Building; mx: number; my: number;
  } | null>(null);
  const [panel, setPanel] = useState<{ room: Room } | null>(null);

  /* keep latest highlightedRoom accessible inside animation loop */
  const highlightRef = useRef<Room | null>(null);
  highlightRef.current = highlightedRoom ?? null;

  /* ── Fly camera to building when staff search highlights a room ── */
  useEffect(() => {
    if (!highlightedRoom) return;
    const bld = campusData.buildings.find(b => b.id === highlightedRoom.buildingId);
    if (!bld) return;
    const bx = bld.position.x, bz = bld.position.z;
    tSph.current.theta = Math.atan2(bx + 0.001, bz + 55);
    tSph.current.phi   = 0.70;
    tSph.current.r     = 78;
    tLookAt.current.set(bx, 10, bz);
  }, [highlightedRoom]);

  /* ── One-time scene setup ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0xc4dff5, 0.0032);

    /* Camera */
    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.5, 700);
    applySpherical(camera, sph.current.theta, sph.current.phi, sph.current.r, lookAt.current);
    cameraRef.current = camera;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* Lighting — sun + sky fill + ambient */
    const sun = new THREE.DirectionalLight(0xfff5e0, 2.0);
    sun.position.set(80, 110, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.left   = -400;
    sun.shadow.camera.right  =  400;
    sun.shadow.camera.top    =  400;
    sun.shadow.camera.bottom = -400;
    sun.shadow.camera.far    =  1200;
    sun.shadow.bias = -0.0003;
    scene.add(sun);

    const skyFill = new THREE.DirectionalLight(0xb0c8ff, 0.45);
    skyFill.position.set(-50, 70, -70);
    scene.add(skyFill);

    scene.add(new THREE.AmbientLight(0xdde8ff, 0.5));

    /* Ground — grass */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshStandardMaterial({ color: 0x4a7c30, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    
    /* Parking lots */
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    [[-120, -70, 40, 60], [120, 70, 40, 60], [0, 120, 90, 35]].forEach(([px, pz, pw, pl]) => {
      const pLot = new THREE.Mesh(new THREE.PlaneGeometry(pw, pl), asphaltMat);
      pLot.rotation.x = -Math.PI / 2;
      pLot.position.set(px, 0.05, pz);
      pLot.receiveShadow = true;
      scene.add(pLot);
      
      const numLines = Math.floor(pw/3.5);
      for(let i=0; i<numLines; i++) {
        const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, pl * 0.35), lineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(px - pw/2 + 2 + i*3.5, 0.06, pz - pl * 0.25);
        scene.add(line1);
        
        const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, pl * 0.35), lineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(px - pw/2 + 2 + i*3.5, 0.06, pz + pl * 0.25);
        scene.add(line2);
      }
    });

/* Pathways */
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xbcb4a4, roughness: 0.85 });
    campusData.pathways.forEach(pw => {
      const dx = pw.end.x - pw.start.x, dz = pw.end.z - pw.start.z;
      const len = Math.hypot(dx, dz);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw.width, len), pathMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.position.set(pw.start.x + dx / 2, 0.02, pw.start.z + dz / 2);
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    /* Trees — data trees + extra border rows */
    campusData.trees.forEach(t => addTree(scene, t.position.x, t.position.z, t.scale));
    const borderTrees: [number, number][] = [
      // Extended landscape trees
      [-150, -150], [-100, -150], [-50, -150], [0, -150], [50, -150], [100, -150], [150, -150],
      [-150, 150], [-100, 150], [-50, 150], [0, 150], [50, 150], [100, 150], [150, 150],
      [-150, -100], [150, -100], [-150, 0], [150, 0], [-150, 100], [150, 100],
      [-120, -80], [120, -80], [-120, 80], [120, 80],

      [-72, -58], [-55, -58], [-38, -58], [-18, -58], [0, -58], [18, -58], [38, -58], [58, -58], [75, -58],
      [-75, 30],  [-55, 32],  [60, 28],   [78, 32],
      [-78, -8],  [82, -8],
    ];
    borderTrees.forEach(([tx, tz]) => addTree(scene, tx, tz, 0.85 + Math.random() * 0.3));

    /* Buildings */
    campusData.buildings.forEach(b => buildBuilding(scene, b, roomMeshes.current, buildingBodies.current));

    /* Lamp posts */
    addLampPosts(scene);

    /* Plaza / courtyard concrete pads between buildings */
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.8 });
    [[-22, -10, 18, 28], [5, -10, 18, 28], [30, -10, 18, 28]].forEach(([px, pz, pw, pl]) => {
      const plaza = new THREE.Mesh(new THREE.PlaneGeometry(pw, pl), plazaMat);
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.set(px, 0.03, pz);
      plaza.receiveShadow = true;
      scene.add(plaza);
    });

    /* ── Raycaster / Interaction ── */
    const rc = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getHit = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      rc.setFromCamera(mouse, camera);
      const objs = [
        ...Array.from(roomMeshes.current.values()),
        ...Array.from(buildingBodies.current.values()),
      ];
      const hits = rc.intersectObjects(objs);
      if (!hits.length) return null;
      const obj = hits[0].object;
      if ((obj as RoomMesh).userData?.room)         return { kind: 'room'     as const, room:     (obj as RoomMesh).userData.room };
      if ((obj as BuildingBodyMesh).userData?.building) return { kind: 'building' as const, building: (obj as BuildingBodyMesh).userData.building };
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      /* drag-orbit */
      if (drag.current.on) {
        const dx = e.clientX - drag.current.lx;
        const dy = e.clientY - drag.current.ly;
        drag.current.lx = e.clientX;
        drag.current.ly = e.clientY;
        tSph.current.theta -= dx * 0.006;
        tSph.current.phi    = Math.max(0.12, Math.min(1.4, tSph.current.phi + dy * 0.006));
        return;
      }
      const hit = getHit(e);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
      if (hit?.kind === 'room')
        setTooltip({ room: hit.room, mx: e.clientX, my: e.clientY });
      else if (hit?.kind === 'building')
        setTooltip({ building: hit.building, mx: e.clientX, my: e.clientY });
      else
        setTooltip(null);
    };

    const onClick = (e: MouseEvent) => {
      const hit = getHit(e);
      if (hit?.kind === 'room') {
        onRoomSelect?.(hit.room);
        setPanel({ room: hit.room });
        const bld = campusData.buildings.find(b => b.id === hit.room.buildingId);
        if (bld) {
          tLookAt.current.set(bld.position.x, 8, bld.position.z);
          tSph.current.r = 78;
        }
      } else if (hit?.kind === 'building') {
        onBuildingSelect?.(hit.building);
        setPanel(null);
        tLookAt.current.set(hit.building.position.x, 10, hit.building.position.z);
        tSph.current.r = 85;
      } else {
        setPanel(null);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      drag.current = { on: true, lx: e.clientX, ly: e.clientY };
    };
    const onMouseUp   = () => { drag.current.on = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      tSph.current.r = Math.max(28, Math.min(210, tSph.current.r + e.deltaY * 0.07));
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click',     onClick);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup',   onMouseUp);
    renderer.domElement.addEventListener('wheel',     onWheel, { passive: false });

    /* ── Animation loop ── */
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      /* Lerp spherical coords */
      const s = sph.current, t = tSph.current;
      s.theta += (t.theta - s.theta) * 0.07;
      s.phi   += (t.phi   - s.phi)   * 0.07;
      s.r     += (t.r     - s.r)     * 0.07;
      lookAt.current.lerp(tLookAt.current, 0.07);
      applySpherical(camera, s.theta, s.phi, s.r, lookAt.current);

      /* Room highlight colors */
      const hr = highlightRef.current;
      roomMeshes.current.forEach(mesh => {
        const room = mesh.userData.room;
        const mat  = mesh.material as THREE.MeshStandardMaterial;
        if (hr?.id === room.id) {
          mat.color.setHex(0xff9900);
          mat.emissive.setHex(0xff5500);
          mat.emissiveIntensity = 0.85;
        } else {
          mat.color.setHex(getRoomColor(room));
          const isOcc = (room.occupancyStatus ?? 'empty') === 'occupied';
          mat.emissive.setHex(isOcc ? 0x200000 : 0x000000);
          mat.emissiveIntensity = isOcc ? 0.15 : 0;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    /* Resize */
    const onResize = () => {
      if (!containerRef.current) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click',     onClick);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup',   onMouseUp);
      renderer.domElement.removeEventListener('wheel',     onWheel);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  /* ─────────────── JSX ─────────────── */
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.mx + 14,
          top:  tooltip.my - 12,
          background: 'rgba(8,10,20,0.9)',
          color: '#fff',
          padding: '7px 12px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.6,
          pointerEvents: 'none',
          zIndex: 200,
          maxWidth: 230,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        }}>
          {tooltip.room ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{tooltip.room.name}</div>
              <div style={{ color: '#bbb', marginBottom: 4 }}>{getRoomTypeLabel(tooltip.room.type)}</div>
              <div style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                background: getStatusHex(tooltip.room.occupancyStatus), fontSize: 11, fontWeight: 600,
              }}>
                {(tooltip.room.occupancyStatus ?? 'empty').toUpperCase()}
              </div>
            </>
          ) : tooltip.building ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{tooltip.building.name}</div>
              <div style={{ color: '#bbb' }}>{tooltip.building.floors.length} floors · Click to explore</div>
            </>
          ) : null}
        </div>
      )}

      {/* Room detail panel (click) */}
      {panel && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 12, padding: '15px 18px', minWidth: 240,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          fontSize: 13, lineHeight: 1.75, zIndex: 50,
          borderTop: `4px solid ${getStatusHex(panel.room.occupancyStatus)}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{panel.room.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{getRoomTypeLabel(panel.room.type)}</div>
            </div>
            <button
              onClick={() => setPanel(null)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:17, color:'#aaa', lineHeight:1, padding:0, marginLeft:8 }}
            >✕</button>
          </div>

          <div><span style={{ color: '#888' }}>Block: </span><b>{panel.room.buildingId}</b></div>
          <div><span style={{ color: '#888' }}>Floor: </span><b>{panel.room.floorNumber}</b></div>
          {(panel.room.capacity ?? 0) > 0 && (
            <div><span style={{ color: '#888' }}>Capacity: </span><b>{panel.room.capacity} students</b></div>
          )}

          <div style={{ marginTop: 8 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600, color: '#fff',
              background: getStatusHex(panel.room.occupancyStatus),
            }}>
              {(panel.room.occupancyStatus ?? 'empty').toUpperCase()}
            </span>
          </div>

          {(() => {
            const staff = findTeacherByRoomId(panel.room.id);
            return staff ? (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                <div style={{ fontWeight: 600, color: '#222', marginBottom: 2 }}>Staff Present</div>
                <div style={{ color: '#111', fontWeight: 500 }}>{staff.staffName}</div>
                <div style={{ color: '#888', fontSize: 11 }}>ID: {staff.staffId}</div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, fontSize: 11,
        color: 'rgba(255,255,255,0.92)', background: 'rgba(0,0,0,0.42)',
        padding: '5px 10px', borderRadius: 6, pointerEvents: 'none', backdropFilter: 'blur(4px)',
      }}>
        Drag to rotate · Scroll to zoom · Click to inspect
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, right: 16,
        background: 'rgba(0,0,0,0.55)', color: '#fff',
        padding: '8px 12px', borderRadius: 8, fontSize: 11,
        lineHeight: 1.9, pointerEvents: 'none', backdropFilter: 'blur(4px)',
      }}>
        {([
          ['#388e3c', 'Free Classroom'],
          ['#c62828', 'Occupied'],
          ['#e65100', 'Maintenance'],
          ['#8e24aa', 'Staff Room'],
          ['#f57c00', 'Seminar Hall'],
          ['#1565c0', 'Office/Admin'],
          ['#ff9900', 'Highlighted Staff'],
        ] as [string, string][]).map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Building construction helper
══════════════════════════════════════════════════════════ */

// ── REPLACEMENT BUILDING GENERATORS ──

// Building A: RIT Block (Blue glass, alternating stripes, red borders)

function addRoofDetails(group: THREE.Group, width: number, depth: number, yPos: number) {
  const acMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.2 });
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  
  for(let i=0; i<4; i++) {
    const w = 1.2 + Math.random() * 1.5;
    const h = 0.8 + Math.random() * 0.8;
    const d = 1.2 + Math.random() * 1.5;
    const ac = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), acMat);
    const px = (Math.random() - 0.5) * (width * 0.6);
    const pz = (Math.random() - 0.5) * (depth * 0.6);
    ac.position.set(px, yPos + h/2, pz);
    ac.castShadow = true;
    group.add(ac);
    
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(w*0.35, w*0.35, 0.1, 8), fanMat);
    fan.position.set(px, yPos + h + 0.05, pz);
    group.add(fan);
  }
}

function addEntranceSteps(group: THREE.Group, width: number, depth: number) {
   const stepMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 });
   for(let i=0; i<4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(12 + i*1.0, 0.2, 1.5), stepMat);
      step.position.set(0, 0.1 + (3-i)*0.2, depth/2 + 1 + i*0.5);
      step.castShadow = true; step.receiveShadow = true;
      group.add(step);
   }
}

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



// ── REPLACEMENT BUILDING GENERATORS ──

// Building A: RIT Block (Blue glass, alternating stripes, red borders)

function addRoofDetails(group: THREE.Group, width: number, depth: number, yPos: number) {
  const acMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.2 });
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  
  for(let i=0; i<4; i++) {
    const w = 1.2 + Math.random() * 1.5;
    const h = 0.8 + Math.random() * 0.8;
    const d = 1.2 + Math.random() * 1.5;
    const ac = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), acMat);
    const px = (Math.random() - 0.5) * (width * 0.6);
    const pz = (Math.random() - 0.5) * (depth * 0.6);
    ac.position.set(px, yPos + h/2, pz);
    ac.castShadow = true;
    group.add(ac);
    
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(w*0.35, w*0.35, 0.1, 8), fanMat);
    fan.position.set(px, yPos + h + 0.05, pz);
    group.add(fan);
  }
}

function addEntranceSteps(group: THREE.Group, width: number, depth: number) {
   const stepMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 });
   for(let i=0; i<4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(12 + i*1.0, 0.2, 1.5), stepMat);
      step.position.set(0, 0.1 + (3-i)*0.2, depth/2 + 1 + i*0.5);
      step.castShadow = true; step.receiveShadow = true;
      group.add(step);
   }
}

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


function buildBuilding(
  scene: THREE.Scene,
  bld: Building,
  roomMap: Map<string, RoomMesh>,
  bodyMap: Map<string, BuildingBodyMesh>
) {
  if (bld.id.includes('A')) {
      createSmartAcademicBlock(scene, bld, bodyMap);
  } else if (bld.id.includes('B') || bld.id.includes('Main') || bld.id.includes('Admin')) {
      createSmartMainBlock(scene, bld, bodyMap);
  } else {
      createSmartAuditorium(scene, bld, bodyMap);
  }

  // Generate clickable room meshes inside glass
  const group = new THREE.Group();
  group.position.set(bld.position.x, bld.position.y, bld.position.z);
  bld.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      const isSeminar = room.type === 'seminar_hall';
      const rW = isSeminar ? 4.0 : 2.5;
      const rH = isSeminar ? 2.3 : 2.0;
      const rD = isSeminar ? 5.2 : 2.9;

      const rMat = new THREE.MeshStandardMaterial({
        color: getRoomColor(room),
        roughness: 0.58, metalness: 0.1,
        transparent: true, opacity: 0.55,
        emissive: (room.occupancyStatus ?? 'empty') === 'occupied'
          ? new THREE.Color(0.12, 0, 0) : new THREE.Color(0, 0, 0),
        emissiveIntensity: (room.occupancyStatus ?? 'empty') === 'occupied' ? 1 : 0,
      });

      const rMesh = new THREE.Mesh(new THREE.BoxGeometry(rW, rH, rD), rMat) as RoomMesh;
      rMesh.userData = { room };
      rMesh.position.set(room.position.x, room.position.y + 1.0, room.position.z);
      rMesh.castShadow = true; rMesh.receiveShadow = true;
      group.add(rMesh);
      roomMap.set(room.id, rMesh);
    });
  });
  scene.add(group);
}


/* ═══════════════════════════════════════════════════════
   Environment helpers
══════════════════════════════════════════════════════════ */
function addTree(scene: THREE.Scene, x: number, z: number, scale: number) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.92 });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 3.5 * scale, 8),
    trunkMat
  );
  trunk.position.y = 1.75 * scale;
  trunk.castShadow = true;
  g.add(trunk);

  const fMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.88 });
  ([
    [3.8, 5.5, 3.5],
    [3.0, 4.5, 6.2],
    [2.0, 3.5, 8.2],
  ] as [number, number, number][]).forEach(([r, h, py]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 8), fMat);
    cone.position.y = py * scale;
    cone.castShadow = true;
    g.add(cone);
  });

  g.position.set(x, 0, z);
  scene.add(g);
}

function addLampPosts(scene: THREE.Scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.6, roughness: 0.4 });
  const globeMat = new THREE.MeshStandardMaterial({
    color: 0xffffcc, emissive: new THREE.Color(0xffee88), emissiveIntensity: 0.6,
  });
  const posts: [number, number][] = [
    [-40, -15], [-20, -15], [5, -15], [25, -15], [55, -15],
    [-40,  22], [-20,  22], [5,  22], [25,  22], [55,  22],
  ];
  posts.forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 6.8, 8), poleMat);
    pole.position.set(lx, 3.4, lz);
    pole.castShadow = true;
    scene.add(pole);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), globeMat);
    globe.position.set(lx, 7.0, lz);
    scene.add(globe);

    const pl = new THREE.PointLight(0xfff0a0, 0.55, 20);
    pl.position.set(lx, 6.8, lz);
    scene.add(pl);
  });
}
