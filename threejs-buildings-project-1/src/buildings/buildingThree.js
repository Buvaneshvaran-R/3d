import * as THREE from 'three';
import { glassMaterial } from '../materials/index';

export function createAuditorium() {
    const auditoriumGroup = new THREE.Group();

    // Building structure
    const auditoriumGeometry = new THREE.BoxGeometry(20, 5, 15);
    const auditoriumMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const auditoriumBlock = new THREE.Mesh(auditoriumGeometry, auditoriumMaterial);
    auditoriumBlock.position.y = 2.5; // Positioning the building above the ground
    auditoriumGroup.add(auditoriumBlock);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(12, 5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 7.5; // Positioning the roof above the building
    roof.rotation.y = Math.PI / 4; // Rotating to create a sloped effect
    auditoriumGroup.add(roof);

    // Glass facade
    const glassGeometry = new THREE.PlaneGeometry(18, 5);
    const glassFront = new THREE.Mesh(glassGeometry, glassMaterial);
    glassFront.position.set(0, 2.5, 7.6); // Positioning the glass facade
    glassFront.rotation.x = -Math.PI / 2; // Rotating to face the front
    auditoriumGroup.add(glassFront);

    // Entrance doors
    const doorGeometry = new THREE.BoxGeometry(2, 3, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, 7.55); // Positioning the doors
    auditoriumGroup.add(door);

    return auditoriumGroup;
}