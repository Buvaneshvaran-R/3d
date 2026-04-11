import * as THREE from 'three';
import { createMaterials } from '../materials/index';

export function createMainBlock() {
    const materials = createMaterials();

    // Main building structure
    const buildingGeometry = new THREE.BoxGeometry(10, 9, 10);
    const buildingMaterial = materials.concrete; // Light beige/white walls
    const mainBlock = new THREE.Mesh(buildingGeometry, buildingMaterial);
    mainBlock.position.set(0, 4.5, 0); // Center the building on the Y-axis

    // Central entrance
    const entranceGeometry = new THREE.BoxGeometry(2, 4, 0.1);
    const entranceMaterial = materials.glass; // Glass for the entrance
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(0, 2, 5.05); // Position the entrance at the front

    // Vertical window columns
    const windowGeometry = new THREE.PlaneGeometry(0.5, 2);
    const windowMaterial = materials.glass; // Glass for windows
    const windowCount = 6;

    for (let i = 0; i < windowCount; i++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(-4 + i, 4, 5.05); // Position windows along the front
        mainBlock.add(window);
    }

    // Add the entrance to the main block
    mainBlock.add(entrance);

    return mainBlock;
}