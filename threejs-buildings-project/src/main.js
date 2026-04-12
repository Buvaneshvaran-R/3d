import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0xc4dff5, 0.0032);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 1000);
camera.position.set(60, 40, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 5, 0);

// Lighting
const sun = new THREE.DirectionalLight(0xfff5e0, 2.0);
sun.position.set(80, 110, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.camera.far = 500;
sun.shadow.bias = -0.0003;
scene.add(sun);

scene.add(new THREE.AmbientLight(0xdde8ff, 0.5));
const skyFill = new THREE.DirectionalLight(0xb0c8ff, 0.45);
skyFill.position.set(-50, 70, -70);
scene.add(skyFill);

// Reusable Glass Material
const smGlassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccee,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.2
});

function createClassroomModule(width, height, depth, color, labelColor) {
    const moduleGroup = new THREE.Group();
    const roomGeometry = new THREE.BoxGeometry(width, height, depth);
    const roomMaterial = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: 0.05,
        transparent: true,
        opacity: 0.98
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.castShadow = true;
    room.receiveShadow = true;
    moduleGroup.add(room);

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.96, Math.max(0.45, height * 0.18), depth * 0.96),
        new THREE.MeshStandardMaterial({ color: labelColor, roughness: 0.6, metalness: 0.05 })
    );
    roof.position.y = height / 2 + Math.max(0.3, height * 0.12);
    moduleGroup.add(roof);

    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(roomGeometry),
        new THREE.LineBasicMaterial({ color: labelColor, transparent: true, opacity: 0.35 })
    );
    moduleGroup.add(edges);

    return moduleGroup;
}

function addClassroomFloorPlan(group, floorY, roomPositions, roomSize, roomHeight, floorColor, labelColor) {
    const floorPlate = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize.width * 0.98, 0.2, roomSize.depth * 0.98),
        new THREE.MeshStandardMaterial({ color: floorColor, transparent: true, opacity: 0.22, roughness: 0.9 })
    );
    floorPlate.position.set(0, floorY + 0.1, 0);
    group.add(floorPlate);

    roomPositions.forEach(({ x, z }) => {
        const classroom = createClassroomModule(roomSize.width, roomHeight, roomSize.depth, floorColor, labelColor);
        classroom.position.set(x, floorY + roomHeight / 2 + 0.2, z);
        group.add(classroom);
    });
}

function createLineLayout(count, spacing) {
    const totalWidth = (count - 1) * spacing;
    return Array.from({ length: count }, (_, index) => ({
        x: -totalWidth / 2 + index * spacing,
        z: 0
    }));
}

function createRingLayout(spacing) {
    return [
        { x: -spacing, z: -spacing },
        { x: 0, z: -spacing },
        { x: spacing, z: -spacing },
        { x: -spacing, z: 0 },
        { x: spacing, z: 0 },
        { x: -spacing, z: spacing },
        { x: 0, z: spacing },
        { x: spacing, z: spacing }
    ];
}

function addTransparentShell(group, width, height, depth, color, opacity) {
    const shellMaterial = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity,
        depthWrite: false
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), shellMaterial);
    shell.position.y = height / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);
    return shell;
}

export function createSmartAcademicBlock(scene: THREE.Scene | undefined, bld: any | undefined, bodyMap: any | undefined) {
  const group = new THREE.Group();
  let width = 28, height = 32, depth = 18;
  if(bld) {
      width = bld.dimensions.width; height = bld.dimensions.height; depth = bld.dimensions.depth;
      group.position.set(bld.position.x, bld.position.y, bld.position.z);
      if(scene) scene.add(group);
  } else {
      if(scene) scene.add(group);
  }

    const shell = addTransparentShell(group, width, height, depth, 0xffffff, 0.18);
  group.add(shell);
  if (bld && bodyMap) bodyMap.set(bld.id, shell);

    const floorCount = 4;
    const floorHeight = height / floorCount;
    const roomWidth = width * 0.14;
    const roomDepth = depth * 0.38;
    const straightLineLayout = createLineLayout(7, width * 0.16);

    for (let floor = 0; floor < floorCount; floor++) {
        addClassroomFloorPlan(
            group,
            floor * floorHeight,
            straightLineLayout,
            { width: roomWidth, depth: roomDepth },
            floorHeight * 0.45,
            [0xe7c8b1, 0xc8d7f0, 0xcfe8cf][floor],
            0x1f2937
        );
    }

  const glassMat = new THREE.MeshStandardMaterial({ color: 0x3388ff, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.5 });
  const glassFacade = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, height * 0.8), glassMat);
  glassFacade.position.set(0, height / 2 + 1, depth / 2 + 0.05);
  group.add(glassFacade);

  const redMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 });
  const topStripe = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.5, 0.2), redMat);
  topStripe.position.set(0, height - 1.5, depth / 2 + 0.08);
  group.add(topStripe);
  
  const midStripe = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.0, 0.2), redMat);
  midStripe.position.set(0, height / 2 - 4, depth / 2 + 0.08);
  group.add(midStripe);

  const bottomStripe = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.5, 0.2), redMat);
  bottomStripe.position.set(0, 3, depth / 2 + 0.08);
  group.add(bottomStripe);

  const signBox = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  signBox.position.set(-width/2 + 6, height + 1.5, depth/2 - 2);
  group.add(signBox);
  
  return bld ? undefined : group;
}

export function createSmartMainBlock(scene: THREE.Scene | undefined, bld: any | undefined, bodyMap: any | undefined) {
    const group = new THREE.Group();
    let width = 32, height = 32, depth = 20;
    if(bld) {
        width = bld.dimensions.width; height = bld.dimensions.height; depth = bld.dimensions.depth;
        group.position.set(bld.position.x, bld.position.y, bld.position.z);
        if(scene) scene.add(group);
    } else {
        if(scene) scene.add(group);
    }

    const shell = addTransparentShell(group, width, height, depth, 0xf0f0f0, 0.16);
    group.add(shell);
    if (bld && bodyMap) bodyMap.set(bld.id, shell);

    const floorCount = 7;
    const floorHeight = height / floorCount;
    const roomWidth = width * 0.14;
    const roomDepth = depth * 0.36;
    const straightLineLayout = createLineLayout(7, width * 0.16);

    for (let floor = 0; floor < floorCount; floor++) {
        addClassroomFloorPlan(
            group,
            floor * floorHeight,
            straightLineLayout,
            { width: roomWidth, depth: roomDepth },
            floorHeight * 0.45,
            [0xd7e3f4, 0xe5d7ef, 0xd8ecd8, 0xf1e2c8, 0xd6edf2, 0xf0d9d0, 0xe2e2e2][floor],
            0x1f2937
        );
    }

    const winMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.8 });
    for(let r=1; r<6; r++) {
        for(let c=-3; c<=3; c++) {
            if(c === 0) continue;
            const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), winMat);
            win.position.set(c * 4, r * (height/6) + 1, depth/2 + 0.05);
            group.add(win);
        }
    }

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, transparent: true, opacity: 0.7 });
    const entranceGlass = new THREE.Mesh(new THREE.PlaneGeometry(6, 12), glassMat);
    entranceGlass.position.set(0, 6, depth/2 + 0.06);
    group.add(entranceGlass);

    const archMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const arch1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), archMat);
    arch1.position.set(0, 4, depth/2 + 0.1);
    arch1.rotation.z = Math.PI / 6;
    group.add(arch1);
    const arch2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), archMat);
    arch2.position.set(0, 4, depth/2 + 0.1);
    arch2.rotation.z = -Math.PI / 6;
    group.add(arch2);

    return bld ? undefined : group;
}

export function createSmartAuditorium(scene: THREE.Scene | undefined, bld: any | undefined, bodyMap: any | undefined) {
    const group = new THREE.Group();
    let width = 35, height = 25, depth = 25;
    if(bld) {
        width = bld.dimensions.width; height = bld.dimensions.height; depth = bld.dimensions.depth;
        group.position.set(bld.position.x, bld.position.y, bld.position.z);
        if(scene) scene.add(group);
    } else {
        if(scene) scene.add(group);
    }

    // Since CampusVisualizer needs a main body mesh to interact with
    const invisibleShell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({visible:false}));
    invisibleShell.position.y = height/2;
    group.add(invisibleShell);
    if (bld && bodyMap) bodyMap.set(bld.id, invisibleShell);

    const floorCount = 4;
    const floorHeight = height / floorCount;
    const roomWidth = width * 0.14;
    const roomDepth = depth * 0.22;
    const ringLayout = createRingLayout(width * 0.18);

    for (let floor = 1; floor < floorCount; floor++) {
        addClassroomFloorPlan(
            group,
            floor * floorHeight,
            ringLayout,
            { width: roomWidth, depth: roomDepth },
            floorHeight * 0.56,
            [0xf1d29a, 0xe8d6f1, 0xd8ecd8][floor - 1],
            0x1f2937
        );
    }

    const brownMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const leftBlock = new THREE.Mesh(new THREE.BoxGeometry(width*0.3, height, depth), brownMat);
    leftBlock.position.set(-width*0.35, height/2, 0);
    leftBlock.castShadow = true;
    group.add(leftBlock);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const rightBlock = new THREE.Mesh(new THREE.BoxGeometry(width*0.5, height, depth), whiteMat);
    rightBlock.position.set(width*0.25, height/2, 0);
    rightBlock.castShadow = true;
    group.add(rightBlock);

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, transparent: true, opacity: 0.6 });
    const midGlass = new THREE.Mesh(new THREE.BoxGeometry(width*0.25, height*0.8, depth+0.5), glassMat);
    midGlass.position.set(-width*0.1, height/2 + height*0.1, 0);
    group.add(midGlass);

    const winMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    for(let r=1; r<=3; r++) {
        const hWin = new THREE.Mesh(new THREE.PlaneGeometry(width*0.3, height*0.1), winMat);
        hWin.position.set(width*0.3, r*(height*0.25), depth/2 + 0.05);
        group.add(hWin);
    }

    return bld ? undefined : group;
}

function createSmartCampusEnvironment() {
    const environmentGroup = new THREE.Group();

    // Ground grass
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x4f7942 })); ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    environmentGroup.add(ground);

    // Pathways
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
    const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(80, 20), pathMat);
    mainPath.rotation.x = -Math.PI / 2;
    mainPath.position.set(0, 0.01, -10);
    mainPath.receiveShadow = true;
    environmentGroup.add(mainPath);

    // Parking Markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 10; i++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 6), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(-30 + i * 3, 0.02, 15);
        environmentGroup.add(line);
    }

    // Entrance Gate
    const gateArch = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    gateArch.position.set(0, 10, 40);
    environmentGroup.add(gateArch);
    
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    pillarL.position.set(-9, 5, 40);
    environmentGroup.add(pillarL);

    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    pillarR.position.set(9, 5, 40);
    environmentGroup.add(pillarR);

    // Digital Board at Gate
    const gateBoard = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ color: 0x00aabb }));
    gateBoard.position.set(0, 10.1, 41.1);
    environmentGroup.add(gateBoard);

    // Smart Street Lights
    const lightPostMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    for (let i = -1; i <= 1; i += 2) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8), lightPostMat);
        post.position.set(i * 15, 4, -4);
        environmentGroup.add(post);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.8), bulbMat);
        bulb.position.set(i * 15, 8, -4);
        environmentGroup.add(bulb);
    }

    // WiFi Towers
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x888888, wireframe: true });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0, 2, 20, 4), towerMat);
    tower.position.set(-40, 10, -50);
    environmentGroup.add(tower);

    // Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
    [[10, 20], [-10, 20], [20, 5], [-20, 5], [30, -30], [-30, -30]].forEach(([tx, tz]) => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3), trunkMat);
        trunk.position.set(tx, 1.5, tz);
        trunk.castShadow = true; trunk.receiveShadow = true;
        environmentGroup.add(trunk);
        
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(3), leavesMat);
        leaves.position.set(tx, 4, tz);
        leaves.castShadow = true; leaves.receiveShadow = true;
        environmentGroup.add(leaves);
    });

    return environmentGroup;
}

function init() {
    const campusEnv = createSmartCampusEnvironment();
    scene.add(campusEnv);

    const b1 = createSmartAcademicBlock();
    b1.position.set(-70, 0, 0);
    scene.add(b1);

    const b2 = createSmartMainBlock();
    b2.position.set(0, 0, 0);
    scene.add(b2);

    const b3 = createSmartAuditorium();
    b3.position.set(70, 0, 0);
    scene.add(b3);

    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();
