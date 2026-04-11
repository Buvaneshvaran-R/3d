import * as THREE from 'three';

const materials = {
  concrete: new THREE.MeshStandardMaterial({
    color: 0xffffff, // White concrete
  }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x88ccee, // Glass color
    transparent: true,
    opacity: 0.5, // Semi-transparent
  }),
  roof: new THREE.MeshStandardMaterial({
    color: 0xff0000, // Red roof
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0xf5f5dc, // Light beige/white walls
  }),
};

export default materials;