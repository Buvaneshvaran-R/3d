import * as THREE from 'three';
import { materials } from '../materials/index';

export function createAcademicBuilding() {
    const buildingGroup = new THREE.Group();

    const buildingHeight = 12; // Height for 4 floors
    const floorHeight = buildingHeight / 4;
    const buildingWidth = 10;
    const buildingDepth = 15;

    // Create the main structure
    const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
    const buildingMaterial = materials.concrete; // Assuming concrete material is defined in materials/index.js
    const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
    buildingMesh.position.y = buildingHeight / 2; // Position it above the ground
    buildingGroup.add(buildingMesh);

    // Create windows
    const windowGeometry = new THREE.PlaneGeometry(2, 3);
    const windowMaterial = materials.glass; // Assuming glass material is defined in materials/index.js

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            windowMesh.position.set(-buildingWidth / 2 + 1.5 + j * 3, floorHeight * (i + 0.5), buildingDepth / 2 + 0.1);
            buildingGroup.add(windowMesh);
        }
    }

    return buildingGroup;
}